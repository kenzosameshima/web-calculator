# Web Calculator

A calculator built with semantic HTML, CSS, and vanilla JavaScript.

## Features

- Standard arithmetic (`+`, `-`, `×`, `÷`), square root, and percentage
- Parentheses with Samsung-calculator-style behavior:
  - repeated `(` only opens further until a number is typed, then it starts closing
  - `+`/`-` right after `(` are sign marks, not closing triggers
  - a number followed by `(` inserts an implicit `×`, e.g. `8(` becomes `8×(`
  - `×` or `÷` followed by `-` opens a parenthesis around the negative operand, e.g. `5×-3` becomes `5×(-3`
  - unmatched `(` are closed automatically when you press `=`
- Light/dark theme toggle

## Running it

Open `index.html` in a browser — no build step or dependencies required.

## Structure

- `index.html` — markup
- `style/style.css` — styling and both themes
- `script/script.js` — calculator logic
- `media/` — favicon
