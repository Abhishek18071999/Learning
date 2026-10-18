// A small, dependency-free syntax highlighter. It is deliberately simple: comments,
// strings, numbers, keywords and a few language-specific tokens. Good enough for
// teaching snippets, and it never executes or evaluates code.

export type TokenType = "comment" | "string" | "number" | "keyword" | "builtin" | "plain" | "prompt";
export interface Token {
  type: TokenType;
  text: string;
}

const KEYWORDS: Record<string, string[]> = {
  python: ["def", "return", "if", "elif", "else", "for", "while", "in", "not", "and", "or", "import", "from", "as", "class", "with", "try", "except", "finally", "raise", "lambda", "None", "True", "False", "is", "pass", "break", "continue", "yield", "async", "await", "global"],
  javascript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "of", "in", "new", "class", "async", "await", "try", "catch", "finally", "throw", "import", "export", "from", "default", "null", "undefined", "true", "false", "typeof", "this"],
  typescript: [],
  sql: ["SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "CREATE", "TABLE", "INDEX", "ON", "PRIMARY", "KEY", "ORDER", "BY", "DESC", "ASC", "LIMIT", "GROUP", "JOIN", "LEFT", "AS", "WITH", "RECURSIVE", "UNION", "ALL", "EXPLAIN", "ANALYZE", "NULL", "IF", "EXISTS", "DATABASE", "USE", "SESSION", "INTERVAL", "DAY", "COUNT", "EXTENSION", "USING", "BUFFERS"],
  bash: ["if", "then", "fi", "for", "do", "done", "in", "while", "else", "elif", "case", "esac", "function", "export", "set", "echo", "cd", "exit", "local"],
  dockerfile: ["FROM", "AS", "RUN", "COPY", "WORKDIR", "ENV", "EXPOSE", "CMD", "ENTRYPOINT", "USER", "ARG", "HEALTHCHECK", "LABEL", "ADD"],
  yaml: [],
};
KEYWORDS.typescript = [...KEYWORDS.javascript, "interface", "type", "extends", "implements", "enum", "readonly", "unknown", "never"];

const ALIASES: Record<string, string> = { js: "javascript", ts: "typescript", tsx: "typescript", py: "python", sh: "bash", shell: "bash", docker: "dockerfile", yml: "yaml" };

export function tokenize(code: string, lang: string): Token[] {
  const l = ALIASES[lang] ?? lang;
  const kw = new Set(KEYWORDS[l] ?? []);
  const caseInsensitive = l === "sql";
  const hashComment = l === "python" || l === "bash" || l === "yaml" || l === "dockerfile";
  const tokens: Token[] = [];
  let i = 0;
  const push = (type: TokenType, text: string) => {
    const last = tokens[tokens.length - 1];
    if (last && last.type === type && type === "plain") last.text += text;
    else tokens.push({ type, text });
  };

  while (i < code.length) {
    const rest = code.slice(i);
    const ch = code[i];
    // comments
    if ((hashComment && ch === "#" && (i === 0 || /\s/.test(code[i - 1]))) || (l !== "python" && l !== "bash" && l !== "yaml" && l !== "dockerfile" && rest.startsWith("//")) || (l === "sql" && rest.startsWith("--"))) {
      const end = code.indexOf("\n", i);
      const text = end === -1 ? rest : code.slice(i, end);
      push("comment", text);
      i += text.length;
      continue;
    }
    // strings (no multi-line except backticks and triple quotes)
    const triple = rest.match(/^("""|''')/);
    if (triple && l === "python") {
      const end = code.indexOf(triple[1], i + 3);
      const text = end === -1 ? rest : code.slice(i, end + 3);
      push("string", text);
      i += text.length;
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
      push(isKw ? "keyword" : /^[A-Z][a-z]/.test(w) && l !== "sql" ? "builtin" : "plain", w);
      i += w.length;
      continue;
    }
    push("plain", ch);
    i++;
  }
  return tokens;
}
