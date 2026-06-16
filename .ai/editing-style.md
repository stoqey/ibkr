# Editing Style Guide

File placement:
- Prefer editing the closest relevant existing file over creating a new file.
- Do not create new `*.utils.*`, `*.helpers.*`, or similar small abstraction files for single-use logic.
- Keep related logic and tests in the nearest sibling file when the change remains readable.

Create a new file only when:
- The logic is reused in multiple places.
- The existing file would become meaningfully harder to understand.
- The user explicitly asks for extraction or separation.

Function structure:
- Prefer one larger readable method over several small single-use methods wired together.
- Keep the main control flow in the owning method when that makes the logic easier to follow top-to-bottom.
- Extract a new method only when the logic is reused in multiple places, the boundary is genuinely clearer, or the user explicitly asks for extraction.
- Do not create pass-through helpers or indirection layers that force readers to jump across methods just to follow one path.

Readability:
- Optimize for code that a human can understand quickly on a direct read.
- Prefer explicit control flow and straightforward data handling over clever tricks, dense chaining, or abstraction for its own sake.
- Use intent-revealing names for variables, methods, and intermediate values.
- Avoid short or ambiguous names unless the scope is tiny and the meaning is obvious.
