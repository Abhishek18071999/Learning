"""Compare two OpenAPI 3 JSON documents and report breaking changes, exiting 1 if any.

Detects: removed paths, removed methods, removed response properties, response type
changes, and newly-required request properties. Resolves top-level $ref before comparing.
"""
import json
import sys

BREAKING = []


def resolve(schema, doc):
    while isinstance(schema, dict) and "$ref" in schema:
        ref = schema["$ref"].removeprefix("#/")
        schema = doc
        for part in ref.split("/"):
            schema = schema.get(part, {})
    return schema if isinstance(schema, dict) else {}


def props(schema):
    return schema.get("properties", {}) if isinstance(schema, dict) else {}


def compare(old, new):
    for path, methods in old.get("paths", {}).items():
        if path not in new.get("paths", {}):
            BREAKING.append(f"removed path {path}")
            continue
        for method, op in methods.items():
            new_op = new["paths"][path].get(method)
            if new_op is None:
                BREAKING.append(f"removed {method.upper()} {path}")
                continue

            def body(op):
                return op.get("requestBody", {}).get("content", {}).get("application/json", {}).get("schema", {})

            def response(op):
                return op.get("responses", {}).get("200", {}).get("content", {}).get("application/json", {}).get("schema", {})

            old_req, new_req = resolve(body(op), old), resolve(body(new_op), new)
            for name in set(new_req.get("required", [])) - set(old_req.get("required", [])):
                BREAKING.append(f"{method.upper()} {path}: request field '{name}' became required")

            old_res, new_res = resolve(response(op), old), resolve(response(new_op), new)
            for name, spec in props(old_res).items():
                if name not in props(new_res):
                    BREAKING.append(f"{method.upper()} {path}: response field '{name}' removed")
                elif spec.get("type") != props(new_res)[name].get("type"):
                    BREAKING.append(f"{method.upper()} {path}: response field '{name}' changed type")


def main():
    if len(sys.argv) != 3:
        print("usage: check-contract.py <old.json> <new.json>")
        sys.exit(2)
    compare(json.load(open(sys.argv[1], encoding="utf-8-sig")), json.load(open(sys.argv[2], encoding="utf-8-sig")))
    print("\n".join(BREAKING) if BREAKING else "no breaking changes")
    sys.exit(1 if BREAKING else 0)


if __name__ == "__main__":
    main()
