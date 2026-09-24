# Web Calculator

A calculator built with semantic HTML, CSS, and vanilla JavaScript, modeled after Samsung's calculator app — both its keypad behavior and its scientific mode.

## Features

- Standard arithmetic (`+`, `-`, `×`, `÷`), percentage, and backspace
- A live preview of the current expression's result above the display, updated as you type
- Parentheses with Samsung-calculator-style behavior:
  - repeated `(` only opens further until a number is typed, then it starts closing
  - `+`/`-` right after `(` are sign marks, not closing triggers
  - a value followed by `(` inserts an implicit `×`, e.g. `8(` becomes `8×(`
  - `×` or `÷` followed by `-` opens a parenthesis around the negative operand, e.g. `5×-3` becomes `5×(-3`
  - unmatched `(` are closed automatically when you press `=`
- Operators that build the expression as readable text rather than computing immediately, e.g. typing `8%` shows `8%` and previews `0.08`; `8` then `x²` shows `8^(2)`; `8` then `√` shows `√(8`; `%` also works after a closed group, e.g. `(5+3)%`
- Keyboard input: digits, `+ - * / ( ) . %`, Enter/`=` to evaluate, Backspace, and Escape/Delete to clear
- A scientific mode (toggled with the `fx` button) with a `2nd` shift key, independent radian/degree switching, trig (with inverses), hyperbolic functions, `ln`/`log`, `√`/`∛`, `|x|`/`2^x`, `1/x`, `π`/`e`, `x²`/`x³`, `x^y`, `x!`, and `+/-` — toggling it shrinks every button into a compact pill-shaped layout so the calculator doesn't grow taller
- Pressing an operator right after `=` continues from the previous result; typing a digit starts a fresh calculation
- Backspace removes an entire function prefix (`sin(`, `log(`, `√(`, ...) in one step instead of leaving a broken partial name behind
- Light/dark theme toggle

## Running it

Open `index.html` in a browser — no build step or dependencies required.

## Structure

- `index.html` — markup
- `style/style.css` — styling, both themes, and the compact scientific-mode layout
- `script/script.js` — calculator logic
- `media/` — favicon
