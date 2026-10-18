import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { LessonPage } from "./pages/LessonPage";
import { News } from "./pages/News";
import { Onboarding } from "./pages/Onboarding";
import { Cheatsheets, Debug, Glossary, Help, Interview, Progress, Project, Quiz, Revise, Roadmap, Settings } from "./pages/Pages";
import { match, query, useRoute } from "./lib/router";

export function App() {
  const route = useRoute();
  const q = query(route);
  const path = route.split("?")[0];

  let page;
  const lesson = match(route, "/lesson/:id");
  if (lesson) page = <LessonPage id={lesson.id} section={q.get("s")} />;
  else if (path === "/start") page = <Onboarding />;
  else if (path === "/roadmap") page = <Roadmap />;
  else if (path === "/revise") page = <Revise />;
  else if (path === "/quiz") page = <Quiz topic={q.get("topic")} />;
  else if (path === "/interview") page = <Interview lessonId={q.get("lesson")} />;
  else if (path === "/project") page = <Project />;
  else if (path === "/news") page = <News />;
  else if (path === "/cheatsheet") page = <Cheatsheets topic={q.get("topic")} />;
  else if (path === "/glossary") page = <Glossary key={q.get("q") ?? ""} q={q.get("q")} />;
  else if (path === "/progress") page = <Progress />;
  else if (path === "/debug") page = <Debug />;
  else if (path === "/help") page = <Help />;
  else if (path === "/settings") page = <Settings />;
  else page = <Home />;

  return <Layout>{page}</Layout>;
}
