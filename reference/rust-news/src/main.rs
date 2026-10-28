use std::sync::Arc;
use std::time::Duration;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use futures::StreamExt;

#[derive(Clone, Debug, Serialize)]
struct NewsItem {
    id: u64,
    title: String,
    url: String,
    topic: String,
    published: Option<String>,
}

#[derive(Clone, Default)]
struct AppState {
    items: Arc<RwLock<Vec<NewsItem>>>,
    refresh_count: Arc<RwLock<u64>>,
    last_error: Arc<RwLock<Option<String>>>,
}

#[derive(Debug, thiserror::Error)]
enum AppError {
    #[error("news item {0} not found")]
    NotFound(u64),
    #[error("{0}")]
    Invalid(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::NotFound(id) => (StatusCode::NOT_FOUND, format!("news item {id} not found")),
            AppError::Invalid(msg) => (StatusCode::UNPROCESSABLE_ENTITY, msg),
        };
        (status, Json(serde_json::json!({ "error": message }))).into_response()
    }
}

#[derive(Debug, thiserror::Error)]
enum IngestError {
    #[error("malformed feed: {0}")]
    Feed(#[from] rss::Error),
}

fn hash(s: &str) -> u64 {
    let mut h: u64 = 0xcbf2_9ce4_8422_2325; // FNV-1a
    for b in s.bytes() {
        h ^= b as u64;
        h = h.wrapping_mul(0x0000_0100_0000_01b3);
    }
    h
}

/// The ingester parser from lesson 1.4.x: XML -> Vec<NewsItem>.
fn parse_feed(xml: &str, topic: &str) -> Result<Vec<NewsItem>, IngestError> {
    let channel = rss::Channel::read_from(xml.as_bytes())?;
    Ok(channel
        .items()
        .iter()
        .filter_map(|item| {
            let title = item.title()?.to_string();
            let url = item.link()?.to_string();
            Some(NewsItem {
                id: hash(&url),
                title,
                url,
                topic: topic.to_string(),
                published: item.pub_date().map(str::to_string),
            })
        })
        .collect())
}

#[derive(Deserialize)]
struct ListParams {
    topic: Option<String>,
    limit: Option<usize>,
}

async fn list_items(
    State(state): State<AppState>,
    Query(p): Query<ListParams>,
) -> Result<Json<Vec<NewsItem>>, AppError> {
    let limit = p.limit.unwrap_or(20);
    if !(1..=100).contains(&limit) {
        return Err(AppError::Invalid("limit must be between 1 and 100".into()));
    }
    let items = state.items.read().await;
    let mut out: Vec<NewsItem> = items
        .iter()
        .filter(|i| p.topic.as_deref().is_none_or(|t| i.topic == t))
        .cloned()
        .collect();
    out.sort_by_key(|i| std::cmp::Reverse(i.id));
    out.truncate(limit);
    Ok(Json(out))
}

async fn get_item(State(state): State<AppState>, Path(id): Path<u64>) -> Result<Json<NewsItem>, AppError> {
    let items = state.items.read().await;
    items
        .iter()
        .find(|i| i.id == id)
        .cloned()
        .map(Json)
        .ok_or(AppError::NotFound(id))
}

#[derive(Serialize)]
struct Stats {
    items: usize,
    topics: usize,
    refresh_count: u64,
    last_error: Option<String>,
}

async fn stats(State(state): State<AppState>) -> Json<Stats> {
    let items = state.items.read().await;
    let topics: std::collections::HashSet<_> = items.iter().map(|i| i.topic.clone()).collect();
    Json(Stats {
        items: items.len(),
        topics: topics.len(),
        refresh_count: *state.refresh_count.read().await,
        last_error: state.last_error.read().await.clone(),
    })
}

fn app(state: AppState) -> Router {
    Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/items", get(list_items))
        .route("/items/{id}", get(get_item))
        .route("/stats", get(stats))
        .with_state(state)
}

/// Fetch one feed with a timeout, parse it, and turn every failure into a value.
async fn fetch_feed(client: &reqwest::Client, name: &str, url: &str) -> Result<Vec<NewsItem>, String> {
    let response = tokio::time::timeout(Duration::from_secs(5), client.get(url).send())
        .await
        .map_err(|_| "timeout".to_string())?
        .map_err(|e| e.to_string())?;
    let xml = response.text().await.map_err(|e| e.to_string())?;
    parse_feed(&xml, name).map_err(|e| e.to_string())
}

/// Refresh every feed with bounded concurrency (at most 8 in flight), then swap the store.
async fn refresh(state: AppState, client: reqwest::Client, feeds: Vec<(String, String)>) {
    let results = futures::stream::iter(feeds.into_iter().map(|(name, url)| {
        let client = client.clone();
        async move {
            let result = fetch_feed(&client, &name, &url).await;
            (name, result)
        }
    }))
    .buffer_unordered(8)
    .collect::<Vec<_>>()
    .await;

    let mut items = Vec::new();
    let mut error: Option<String> = None;
    for (name, result) in results {
        match result {
            Ok(mut fetched) => items.append(&mut fetched),
            Err(e) => error = Some(format!("{name}: {e}")),
        }
    }
    items.sort_by_key(|i| std::cmp::Reverse(i.id));

    *state.items.write().await = items;
    *state.refresh_count.write().await += 1;
    *state.last_error.write().await = error;
}

#[tokio::main]
async fn main() {
    let feeds_env = std::env::var("FEEDS")
        .unwrap_or_else(|_| "python=https://blog.python.org/feeds/posts/default?alt=rss".to_string());
    let feeds: Vec<(String, String)> = feeds_env
        .split(',')
        .filter_map(|s| s.split_once('=').map(|(n, u)| (n.to_string(), u.to_string())))
        .collect();

    let state = AppState::default();
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .expect("build http client");

    {
        let state = state.clone();
        let client = client.clone();
        let feeds = feeds.clone();
        tokio::spawn(async move {
            let mut tick = tokio::time::interval(Duration::from_secs(300));
            loop {
                tick.tick().await;
                refresh(state.clone(), client.clone(), feeds.clone()).await;
            }
        });
    }

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.expect("bind port 3000");
    axum::serve(listener, app(state))
        .with_graceful_shutdown(async { tokio::signal::ctrl_c().await.ok(); })
        .await
        .expect("server error");
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    async fn seeded() -> AppState {
        let state = AppState::default();
        state.items.write().await.push(NewsItem {
            id: 1,
            title: "Hello".into(),
            url: "https://x.dev/1".into(),
            topic: "rust".into(),
            published: None,
        });
        state
    }

    #[tokio::test]
    async fn missing_item_is_404_json() {
        let res = app(AppState::default())
            .oneshot(Request::get("/items/42").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
        let body = res.into_body().collect().await.unwrap().to_bytes();
        assert_eq!(&body[..], br#"{"error":"news item 42 not found"}"#);
    }

    #[tokio::test]
    async fn list_and_get_work() {
        let state = seeded().await;
        let res = app(state.clone())
            .oneshot(Request::get("/items/1").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        let res = app(state)
            .oneshot(Request::get("/items?topic=rust").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn parse_feed_extracts_title_and_topic() {
        let xml = r#"<rss version="2.0"><channel><item><title>Hello</title><link>https://x.dev/1</link></item></channel></rss>"#;
        let items = parse_feed(xml, "test").unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].title, "Hello");
        assert_eq!(items[0].topic, "test");
    }

    #[tokio::test]
    async fn malformed_feed_is_an_error_not_a_panic() {
        let err = parse_feed("<rss><channel>", "test").unwrap_err();
        assert!(err.to_string().starts_with("malformed feed"));
    }
}
