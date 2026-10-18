// A small, dependency-free syntax highlighter. It is deliberately simple: comments,
// strings, numbers, keywords and a few language-specific tokens. Good enough for
// teaching snippets, and it never executes or evaluates code.

export type TokenType = "comment" | "string" | "number" | "keyword" | "builtin" | "plain" | "prompt";
export interface Token {
  type: TokenType;
  text: string;
}

const KEYWORDS: Record<string, string[]> = {
  python: ["def", "return", "if", "elif", "else", "for", "while", "in", "not", "and", "or", "import", "from", "as", "class", "with", "try", "except", "finally", "raise", "lambda", "None", "True", "False", "is", "pass", "break", "continue", "yield", "async", "await", "global", "nonlocal"],
  javascript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "of", "in", "new", "class", "async", "await", "try", "catch", "finally", "throw", "import", "export", "from", "default", "null", "undefined", "true", "false", "typeof", "this", "switch", "case", "break"],
  typescript: [],
  csharp: ["using", "namespace", "class", "record", "struct", "interface", "public", "private", "protected", "internal", "static", "readonly", "sealed", "abstract", "override", "virtual", "async", "await", "return", "var", "new", "if", "else", "for", "foreach", "in", "while", "switch", "case", "default", "try", "catch", "finally", "throw", "null", "true", "false", "this", "base", "void", "string", "int", "long", "bool", "double", "decimal", "object", "is", "not", "and", "or", "when", "get", "set", "init", "required", "with", "where", "out", "ref", "params", "typeof", "nameof", "const", "enum", "break", "continue"],
  rust: ["fn", "let", "mut", "pub", "struct", "enum", "impl", "trait", "for", "in", "if", "else", "match", "while", "loop", "return", "use", "mod", "crate", "self", "Self", "super", "where", "as", "ref", "move", "async", "await", "dyn", "const", "static", "type", "true", "false", "Some", "None", "Ok", "Err", "break", "continue"],
  go: ["package", "import", "func", "return", "if", "else", "for", "range", "var", "const", "type", "struct", "interface", "map", "chan", "go", "defer", "nil", "true", "false"],
  sql: ["SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "CREATE", "TABLE", "INDEX", "ON", "PRIMARY", "KEY", "FOREIGN", "REFERENCES", "ORDER", "BY", "DESC", "ASC", "LIMIT", "OFFSET", "GROUP", "HAVING", "JOIN", "LEFT", "INNER", "AS", "WITH", "RECURSIVE", "UNION", "ALL", "EXPLAIN", "ANALYZE", "NULL", "IF", "EXISTS", "DATABASE", "USE", "SESSION", "INTERVAL", "DAY", "COUNT", "EXTENSION", "USING", "BUFFERS", "BEGIN", "COMMIT", "ROLLBACK", "TRANSACTION", "FOR", "UNIQUE", "DEFAULT", "ALTER", "ADD", "COLUMN", "DROP", "CONCURRENTLY", "IN", "IS", "BETWEEN", "CASE", "WHEN", "THEN", "ELSE", "END", "DISTINCT", "LIKE", "ISOLATION", "LEVEL", "READ", "COMMITTED", "REPEATABLE", "SERIALIZABLE", "RETURNING", "CHECK", "CONSTRAINT"],
  bash: ["if", "then", "fi", "for", "do", "done", "in", "while", "else", "elif", "case", "esac", "function", "export", "set", "echo", "cd", "exit", "local", "return"],
  dockerfile: ["FROM", "AS", "RUN", "COPY", "WORKDIR", "ENV", "EXPOSE", "CMD", "ENTRYPOINT", "USER", "ARG", "HEALTHCHECK", "LABEL", "ADD"],
  hcl: ["resource", "variable", "output", "provider", "module", "data", "locals", "terraform", "true", "false", "null", "for_each", "count", "depends_on"],
  yaml: ["true", "false", "null"],
  css: [],
  html: [],
};
KEYWORDS.typescript = [...KEYWORDS.javascript, "interface", "type", "extends", "implements", "enum", "readonly", "unknown", "never", "as", "satisfies", "keyof"];

const ALIASES: Record<string, string> = {
  js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript", py: "python", sh: "bash", shell: "bash",
  docker: "dockerfile", yml: "yaml", cs: "csharp", rs: "rust", terraform: "hcl", tf: "hcl", xml: "html", toml: "yaml",
};

const HASH_COMMENTS = new Set(["python", "bash", "yaml", "dockerfile", "hcl"]);
const SLASH_COMMENTS = new Set(["javascript", "typescript", "csharp", "rust", "go", "hcl", "css"]);
const BLOCK_COMMENTS = new Set(["javascript", "typescript", "csharp", "rust", "go", "css", "sql", "hcl"]);

export function tokenize(code: string, lang: string): Token[] {
  const l = ALIASES[lang] ?? lang;
  const kw = new Set(KEYWORDS[l] ?? []);
  const caseInsensitive = l === "sql";
  const tokens: Token[] = [];
  let i = 0;
  let inTag = false; // html: quotes are strings only inside tags
  const push = (type: TokenType, text: string) => {
    const last = tokens[tokens.length - 1];
    if (last && last.type === type && type === "plain") last.text += text;
    else tokens.push({ type, text });
  };
  const lineComment = (start: number) => {
    const end = code.indexOf("\n", start);
    return end === -1 ? code.slice(start) : code.slice(start, end);
  };

  while (i < code.length) {
    const rest = code.slice(i);
    const ch = code[i];

    // comments
    if (l === "html" && rest.startsWith("<!--")) {
      const end = code.indexOf("-->", i);
      const text = end === -1 ? rest : code.slice(i, end + 3);
      push("comment", text);
      i += text.length;
      continue;
    }
    if (BLOCK_COMMENTS.has(l) && rest.startsWith("/*")) {
      const end = code.indexOf("*/", i + 2);
      const text = end === -1 ? rest : code.slice(i, end + 2);
      push("comment", text);
      i += text.length;
      continue;
    }
    const slashComment = SLASH_COMMENTS.has(l) && rest.startsWith("//") && !(l === "css" || code[i - 1] === ":");
    const hashComment = HASH_COMMENTS.has(l) && ch === "#" && (i === 0 || /\s/.test(code[i - 1]));
    const dashComment = l === "sql" && rest.startsWith("--");
    if (slashComment || hashComment || dashComment) {
      const text = lineComment(i);
      push("comment", text);
      i += text.length;
      continue;
    }

    // html tags
    if (l === "html") {
      const tag = rest.match(/^<\/?[A-Za-z][\w-]*/);
      if (tag) {
        const open = tag[0].startsWith("</") ? "</" : "<";
        push("plain", open);
        push("keyword", tag[0].slice(open.length));
        i += tag[0].length;
        inTag = true;
        continue;
      }
      if (ch === ">") inTag = false;
      if (!inTag && (ch === '"' || ch === "'")) {
        push("plain", ch);
        i++;
        continue;
      }
    }

    // strings
    const triple = rest.match(/^("""|''')/);
    if (triple && l === "python") {
      const end = code.indexOf(triple[1], i + 3);
      const text = end === -1 ? rest : code.slice(i, end + 3);
      push("string", text);
      i += text.length;
      continue;
    }
    if (l === "rust" && ch === "'") {
      // char literal like 'x' or '\n'; otherwise a lifetime such as 'a
      const charLit = rest.match(/^'(\\.|[^\\'\n])'/);
      if (charLit) {
        push("string", charLit[0]);
        i += charLit[0].length;
      } else {
        const life = rest.match(/^'[A-Za-z_]\w*/);
        push("builtin", life ? life[0] : ch);
        i += life ? life[0].length : 1;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || (ch === "`" && (l === "javascript" || l === "typescript"))) {
      let j = i + 1;
      while (j < code.length && code[j] !== ch && (ch === "`" || code[j] !== "\n")) {
        if (code[j] === "\\") j++;
        j++;
      }
      const text = code.slice(i, j + 1);
      push("string", text);
      i += text.length;
      continue;
    }

    const num = rest.match(/^\d[\d_]*(\.\d+)?/);
    if (num && (i === 0 || !/[\w$]/.test(code[i - 1]))) {
      push("number", num[0]);
      i += num[0].length;
      continue;
    }
    const word = rest.match(/^[A-Za-z_$][\w$]*/);
    if (word) {
      const w = word[0];
      const isKw = kw.has(caseInsensitive ? w.toUpperCase() : w);
      const isType = /^[A-Z][a-z]/.test(w) && l !== "sql" && l !== "html" && l !== "yaml";
      push(isKw ? "keyword" : isType ? "builtin" : "plain", w);
      i += w.length;
      continue;
    }
    push("plain", ch);
    i++;
  }
  return tokens;
}
