const display = document.querySelector('#display');
const buttons = document.querySelectorAll('button');
const themeToggleBtn = document.querySelector('.theme-toggler');
const calculator = document.querySelector('.calculator');
let lastResult = '';
let openedParentheses = 0;
let closedParentheses = 0;

// What kind of token the display currently ends with. Drives whether the
// next button press appends, replaces, or is ignored.
// null | 'open-paren' | 'close-paren' | 'sign' | 'operator' | 'digit' | 'decimal' | 'percent'
let lastType = null;

// A "value" is a complete operand that a trailing `)` or an implicit `*(`
// can attach to. A bare sign or an operator isn't one yet.
function isValueType(type) {
    return type === 'digit' || type === 'decimal' || type === 'percent' || type === 'close-paren';
}

function currentSegmentHasDecimal() {
    const match = display.textContent.match(/(-?\d*\.?\d*)$/);
    return match ? match[0].includes('.') : false;
}

function applyOperator(op) {
    if (lastType === null || lastType === 'open-paren') {
        if ((op === '-' || op === '+') && display.textContent.length < 14) {
            display.textContent += op;
            lastType = 'sign';
        }
        return;
    }

    if (lastType === 'sign') {
        if (op === '-' || op === '+') {
            display.textContent = display.textContent.slice(0, -1) + op;
            return;
        }
        display.textContent = display.textContent.slice(0, -1);
        lastType = display.textContent.endsWith('(') ? 'open-paren' : (display.textContent.length === 0 ? null : lastType);
        return;
    }

    if (lastType === 'operator') {
        // Samsung-calculator quirk: `*` or `/` followed by `-` opens a
        // parenthesis around the negative operand instead of just swapping
        // the operator, e.g. typing "5*-3" shows "5*(-3" and evaluates to -15.
        if (op === '-' && (display.textContent.endsWith('*') || display.textContent.endsWith('/'))) {
            if (display.textContent.length <= 14 - 2) {
                display.textContent += '(-';
                openedParentheses++;
                lastType = 'sign';
            }
            return;
        }
        display.textContent = display.textContent.slice(0, -1) + op;
        return;
    }

    if (display.textContent.length < 14) {
        display.textContent += op;
        lastType = 'operator';
    }
}

function applyParenthesis() {
    const canClose = openedParentheses > closedParentheses && isValueType(lastType);
    if (canClose) {
        if (display.textContent.length < 14) {
            display.textContent += ')';
            closedParentheses++;
            lastType = 'close-paren';
        }
        return;
    }

    const insertion = isValueType(lastType) ? '*(' : '(';
    if (display.textContent.length <= 14 - insertion.length) {
        display.textContent += insertion;
        openedParentheses++;
        lastType = 'open-paren';
    }
}

function applyPercentage() {
    if (lastType !== 'digit' && lastType !== 'decimal') {
        return;
    }
    const match = display.textContent.match(/(-?\d+\.?\d*|-?\.\d+)$/);
    if (!match) {
        return;
    }
    const prefix = display.textContent.slice(0, match.index);
    const value = parseFloat(match[0]) / 100;
    display.textContent = prefix + value;
    lastType = 'percent';
}

buttons.forEach((item) => {
    item.addEventListener('click', () => {
        const operator = item.dataset.operator;
        if (operator) {
            if (operator === 'clear') {
                display.textContent = '';
                lastResult = '';
                openedParentheses = 0;
                closedParentheses = 0;
                lastType = null;
            } else if (operator === '=') {
                try {
                    const unclosed = openedParentheses - closedParentheses;
                    const expression = unclosed > 0 ? display.textContent + ')'.repeat(unclosed) : display.textContent;
                    let result = eval(expression);
                    if (result % 1 !== 0) {
                        result = parseFloat(result.toFixed(14));
                    }
                    display.textContent = result;
                    lastResult = result;
                    lastType = 'digit';
                } catch (error) {
                    display.textContent = 'Error';
                    lastType = null;
                }
            } else if (operator === 'sqrt') {
                let result = Math.sqrt(parseFloat(display.textContent));
                if (result % 1 !== 0) {
                    result = parseFloat(result.toFixed(14));
                }
                display.textContent = result;
                lastResult = result;
                lastType = 'digit';
            } else if (operator === '()') {
                applyParenthesis();
            } else if (operator === 'percentage') {
                applyPercentage();
            } else {
                applyOperator(operator);
            }
        } else {
            if (item.textContent === '.') {
                if (currentSegmentHasDecimal()) {
                    return;
                }
                // No digit typed yet for this number (start of expression, right
                // after an operator/open-paren/sign) -> "0." instead of ".".
                const needsLeadingZero = lastType === null || lastType === 'operator' || lastType === 'open-paren' || lastType === 'sign';
                const insertion = needsLeadingZero ? '0.' : '.';
                if (display.textContent.length <= 14 - insertion.length) {
                    display.textContent += insertion;
                    lastType = 'decimal';
                }
            } else {
                if (display.textContent.length < 14) {
                    display.textContent += item.textContent;
                    lastType = 'digit';
                }
            }
        }
    });
});

themeToggleBtn.addEventListener('click', () => {
    calculator.classList.toggle('dark');
    themeToggleBtn.classList.toggle('active');
});
