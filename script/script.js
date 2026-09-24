const display = document.querySelector('#display');
const preview = document.querySelector('#preview');
const themeToggleBtn = document.querySelector('.theme-toggler');
const calculator = document.querySelector('.calculator');
const sciToggleBtn = document.querySelector('#sci-toggle');
const sciPanel = document.querySelector('#scientific-buttons');
const sciShiftBtn = document.querySelector('#sci-shift');
const sciAngleBtn = document.querySelector('#sci-angle');

// Calculator function buttons only -- excludes the theme/scientific-mode
// togglers, which live outside .buttons and have their own listeners.
const buttons = document.querySelectorAll('.buttons button');

const MAX_LENGTH = 32;
const PI = 'π';
const EULER = 'ℯ'; // distinct from ASCII "e" so it can never be mistaken
                         // for the exponent marker in a JS number literal like "5e3"

let lastResult = '';
let openedParentheses = 0;
let closedParentheses = 0;
let justEvaluated = false;
let isShifted = false;
let angleMode = 'rad';

// What kind of token the display currently ends with. Drives whether the
// next button press appends, replaces, or is ignored.
// null | 'open-paren' | 'close-paren' | 'sign' | 'operator' | 'digit' | 'decimal' | 'percent' | 'constant'
let lastType = null;

// A "value" is a complete operand that a trailing `)`, an implicit `*(`, or
// a postfix transform can attach to. A bare sign or an operator isn't one.
function isValueType(type) {
    return type === 'digit' || type === 'decimal' || type === 'percent' || type === 'close-paren' || type === 'constant';
}

function currentSegmentHasDecimal() {
    const match = display.textContent.match(/(-?\d*\.?\d*)$/);
    return match ? match[0].includes('.') : false;
}

// Call when a DIGIT or DECIMAL is pressed right after "=": starts a fresh
// calculation instead of appending to the old result.
function clearIfJustEvaluated() {
    if (justEvaluated) {
        display.textContent = '';
        lastType = null;
        openedParentheses = 0;
        closedParentheses = 0;
    }
    justEvaluated = false;
}

// Call for everything else pressed after "=" (operators, parens, %,
// backspace, scientific functions): keeps the result and builds on it.
function continueFromResult() {
    justEvaluated = false;
}

function applyOperator(op) {
    if (lastType === null || lastType === 'open-paren') {
        if ((op === '-' || op === '+') && display.textContent.length < MAX_LENGTH) {
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
            if (display.textContent.length <= MAX_LENGTH - 2) {
                display.textContent += '(-';
                openedParentheses++;
                lastType = 'sign';
            }
            return;
        }
        display.textContent = display.textContent.slice(0, -1) + op;
        return;
    }

    if (display.textContent.length < MAX_LENGTH) {
        display.textContent += op;
        lastType = 'operator';
    }
}

function applyParenthesis() {
    const canClose = openedParentheses > closedParentheses && isValueType(lastType);
    if (canClose) {
        if (display.textContent.length < MAX_LENGTH) {
            display.textContent += ')';
            closedParentheses++;
            lastType = 'close-paren';
        }
        return;
    }

    const insertion = isValueType(lastType) ? '*(' : '(';
    if (display.textContent.length <= MAX_LENGTH - insertion.length) {
        display.textContent += insertion;
        openedParentheses++;
        lastType = 'open-paren';
    }
}

// Applies fn to the trailing numeric value and splices the result back in,
// e.g. "5+" + "3" -> press -> "5+" + fn(3). Used by %, 1/x, x^2, x!, +/-, etc.
function applyUnaryTransform(fn, resultingType) {
    if (lastType !== 'digit' && lastType !== 'decimal' && lastType !== 'percent') {
        return;
    }
    const match = display.textContent.match(/(-?\d+\.?\d*|-?\.\d+)$/);
    if (!match) {
        return;
    }
    const prefix = display.textContent.slice(0, match.index);
    const result = fn(parseFloat(match[0]));
    if (typeof result !== 'number' || !Number.isFinite(result)) {
        display.textContent = 'Error';
        lastType = null;
        openedParentheses = 0;
        closedParentheses = 0;
        return;
    }
    const rounded = Number.isInteger(result) ? result : parseFloat(result.toFixed(12));
    display.textContent = prefix + rounded;
    lastType = resultingType || 'digit';
}

function applyPercentage() {
    applyUnaryTransform((x) => x / 100, 'percent');
}

function applyBackspace() {
    if (display.textContent.length === 0) {
        return;
    }
    const removed = display.textContent[display.textContent.length - 1];
    display.textContent = display.textContent.slice(0, -1);
    if (removed === '(') {
        openedParentheses = Math.max(0, openedParentheses - 1);
    } else if (removed === ')') {
        closedParentheses = Math.max(0, closedParentheses - 1);
    }
    lastType = inferLastType();
}

// Re-derives lastType from the trailing character(s) of the display. Only
// needed after backspace, since every other action tracks it incrementally.
function inferLastType() {
    const text = display.textContent;
    if (text.length === 0) {
        return null;
    }
    const last = text[text.length - 1];
    if (last === '(') {
        return 'open-paren';
    }
    if (last === ')') {
        return 'close-paren';
    }
    if (last === '.') {
        return 'decimal';
    }
    if (last >= '0' && last <= '9') {
        return 'digit';
    }
    if (last === PI || last === EULER) {
        return 'constant';
    }
    if (last === '+' || last === '-') {
        const prev = text[text.length - 2];
        const prevIsValue = prev !== undefined && (
            (prev >= '0' && prev <= '9') || prev === ')' || prev === '.' || prev === PI || prev === EULER
        );
        return prevIsValue ? 'operator' : 'sign';
    }
    if (last === '*' || last === '/' || last === '%' || last === '^') {
        return 'operator';
    }
    return null;
}

// ---- scientific functions -------------------------------------------------

function toRadians(x) {
    return angleMode === 'deg' ? (x * Math.PI) / 180 : x;
}

function toCurrentAngleUnit(x) {
    return angleMode === 'deg' ? (x * 180) / Math.PI : x;
}

function calcSin(x) { return Math.sin(toRadians(x)); }
function calcCos(x) { return Math.cos(toRadians(x)); }
function calcTan(x) { return Math.tan(toRadians(x)); }
function calcAsin(x) { return toCurrentAngleUnit(Math.asin(x)); }
function calcAcos(x) { return toCurrentAngleUnit(Math.acos(x)); }
function calcAtan(x) { return toCurrentAngleUnit(Math.atan(x)); }

function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) {
        return NaN;
    }
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

function insertConstant(symbol) {
    const prefix = isValueType(lastType) ? '*' : '';
    const insertion = prefix + symbol;
    if (display.textContent.length > MAX_LENGTH - insertion.length) {
        return;
    }
    display.textContent += insertion;
    lastType = 'constant';
}

function insertFunction(text) {
    const prefix = isValueType(lastType) ? '*' : '';
    const insertion = prefix + text;
    if (display.textContent.length > MAX_LENGTH - insertion.length) {
        return;
    }
    display.textContent += insertion;
    openedParentheses++;
    lastType = 'open-paren';
}

const SCI_LABELS = {
    sqrt: ['√', '∛'],
    mod: ['mod', '2^x'],
    sin: ['sin', 'sin⁻¹'],
    cos: ['cos', 'cos⁻¹'],
    tan: ['tan', 'tan⁻¹'],
    pi: [PI, EULER],
    ln: ['ln', 'sinh'],
    log: ['log', 'cosh'],
    reciprocal: ['1/x', 'tanh'],
    econst: [EULER, 'x!'],
    exp: ['e^x', 'sinh⁻¹'],
    square: ['x²', 'cosh⁻¹'],
    power: ['x^y', 'tanh⁻¹'],
};

const SCI_ARIA = {
    sqrt: ['Square root', 'Cube root'],
    mod: ['Modulo', '2 to the power of x'],
    sin: ['Sine', 'Inverse sine'],
    cos: ['Cosine', 'Inverse cosine'],
    tan: ['Tangent', 'Inverse tangent'],
    pi: ['Pi', "Euler's number"],
    ln: ['Natural log', 'Hyperbolic sine'],
    log: ['Log base 10', 'Hyperbolic cosine'],
    reciprocal: ['Reciprocal', 'Hyperbolic tangent'],
    econst: ["Euler's number", 'Factorial'],
    exp: ['e to the x', 'Inverse hyperbolic sine'],
    square: ['x squared', 'Inverse hyperbolic cosine'],
    power: ['x to the y', 'Inverse hyperbolic tangent'],
};

function updateScientificLabels() {
    const idx = isShifted ? 1 : 0;
    Object.keys(SCI_LABELS).forEach((key) => {
        const btn = sciPanel.querySelector(`[data-sci="${key}"]`);
        if (!btn) {
            return;
        }
        btn.textContent = SCI_LABELS[key][idx];
        btn.setAttribute('aria-label', SCI_ARIA[key][idx]);
    });
    sciShiftBtn.setAttribute('aria-pressed', String(isShifted));
}

function updateAngleLabel() {
    sciAngleBtn.textContent = angleMode === 'rad' ? 'Rad' : 'Deg';
    sciAngleBtn.setAttribute('aria-label', angleMode === 'rad' ? 'Angle unit: radians' : 'Angle unit: degrees');
}

function handleScientific(key) {
    if (key === 'shift') {
        isShifted = !isShifted;
        updateScientificLabels();
        return;
    }
    if (key === 'angle') {
        angleMode = angleMode === 'rad' ? 'deg' : 'rad';
        updateAngleLabel();
        return;
    }

    continueFromResult();

    switch (key) {
        case 'sqrt':
            applyUnaryTransform(isShifted ? Math.cbrt : Math.sqrt);
            break;
        case 'mod':
            if (isShifted) {
                applyUnaryTransform((x) => Math.pow(2, x));
            } else {
                applyOperator('%');
            }
            break;
        case 'sin':
            insertFunction(isShifted ? 'sin⁻¹(' : 'sin(');
            break;
        case 'cos':
            insertFunction(isShifted ? 'cos⁻¹(' : 'cos(');
            break;
        case 'tan':
            insertFunction(isShifted ? 'tan⁻¹(' : 'tan(');
            break;
        case 'pi':
            insertConstant(isShifted ? EULER : PI);
            break;
        case 'ln':
            insertFunction(isShifted ? 'sinh(' : 'ln(');
            break;
        case 'log':
            insertFunction(isShifted ? 'cosh(' : 'log(');
            break;
        case 'reciprocal':
            if (isShifted) {
                insertFunction('tanh(');
            } else {
                applyUnaryTransform((x) => 1 / x);
            }
            break;
        case 'econst':
            if (isShifted) {
                applyUnaryTransform(factorial);
            } else {
                insertConstant(EULER);
            }
            break;
        case 'exp':
            insertFunction(isShifted ? 'sinh⁻¹(' : 'e^(');
            break;
        case 'square':
            if (isShifted) {
                insertFunction('cosh⁻¹(');
            } else {
                applyUnaryTransform((x) => x * x);
            }
            break;
        case 'power':
            if (isShifted) {
                insertFunction('tanh⁻¹(');
            } else {
                applyOperator('^');
            }
            break;
        case 'sign':
            applyUnaryTransform((x) => -x);
            break;
        default:
            break;
    }
}

// ---- evaluation -------------------------------------------------------

// Converts the human-readable display text into valid JS for eval(). Order
// matters: multi-character patterns must be replaced before the generic `^`
// pass, or e.g. "e^(" would be mangled before it becomes "Math.exp(".
// Sequential find/replace is unsafe here: one substitution's OUTPUT can
// accidentally contain a later substitution's INPUT pattern (e.g. "ln(" ->
// "Math.log(" would then get re-matched by the "log(" -> "Math.log10(" step,
// and "sin⁻¹(" -> "calcAsin(" contains "sin(" too). A single regex
// pass over the ORIGINAL text avoids that: matches are found before any
// replacement happens, so replacement text is never rescanned.
const EVAL_REPLACEMENTS = {
    'sin⁻¹(': 'calcAsin(',
    'cos⁻¹(': 'calcAcos(',
    'tan⁻¹(': 'calcAtan(',
    'sinh⁻¹(': 'Math.asinh(',
    'cosh⁻¹(': 'Math.acosh(',
    'tanh⁻¹(': 'Math.atanh(',
    'sin(': 'calcSin(',
    'cos(': 'calcCos(',
    'tan(': 'calcTan(',
    'sinh(': 'Math.sinh(',
    'cosh(': 'Math.cosh(',
    'tanh(': 'Math.tanh(',
    'ln(': 'Math.log(',
    'log(': 'Math.log10(',
    '√(': 'Math.sqrt(',
    '∛(': 'Math.cbrt(',
    'e^(': 'Math.exp(',
    [PI]: 'Math.PI',
    [EULER]: 'Math.E',
    '^': '**',
};

const EVAL_REPLACEMENT_PATTERN = new RegExp(
    Object.keys(EVAL_REPLACEMENTS)
        .sort((a, b) => b.length - a.length)
        .map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|'),
    'g'
);

function toEvaluable(text) {
    return text.replace(EVAL_REPLACEMENT_PATTERN, (match) => EVAL_REPLACEMENTS[match]);
}

function buildEvaluableExpression() {
    const unclosed = openedParentheses - closedParentheses;
    const raw = unclosed > 0 ? display.textContent + ')'.repeat(unclosed) : display.textContent;
    return toEvaluable(raw);
}

function evaluateExpression(text) {
    const result = eval(text);
    if (typeof result !== 'number' || !Number.isFinite(result)) {
        throw new Error('Invalid result');
    }
    return result;
}

function updatePreview() {
    if (!display.textContent) {
        preview.textContent = '';
        return;
    }
    try {
        let result = evaluateExpression(buildEvaluableExpression());
        if (result % 1 !== 0) {
            result = parseFloat(result.toFixed(10));
        }
        if (String(result) === display.textContent) {
            preview.textContent = '';
            return;
        }
        preview.textContent = '= ' + result;
    } catch (error) {
        preview.textContent = '';
    }
}

// ---- input dispatch -----------------------------------------------------

buttons.forEach((item) => {
    item.addEventListener('click', () => {
        if (item.dataset.sci) {
            handleScientific(item.dataset.sci);
            updatePreview();
            return;
        }

        const operator = item.dataset.operator;
        if (operator) {
            if (operator === 'clear') {
                display.textContent = '';
                lastResult = '';
                openedParentheses = 0;
                closedParentheses = 0;
                lastType = null;
                justEvaluated = false;
            } else if (operator === '=') {
                try {
                    let result = evaluateExpression(buildEvaluableExpression());
                    if (result % 1 !== 0) {
                        result = parseFloat(result.toFixed(14));
                    }
                    display.textContent = result;
                    lastResult = result;
                    lastType = 'digit';
                    justEvaluated = true;
                } catch (error) {
                    display.textContent = 'Error';
                    lastType = null;
                    openedParentheses = 0;
                    closedParentheses = 0;
                    justEvaluated = false;
                }
            } else if (operator === 'backspace') {
                continueFromResult();
                applyBackspace();
            } else if (operator === '()') {
                continueFromResult();
                applyParenthesis();
            } else if (operator === 'percentage') {
                continueFromResult();
                applyPercentage();
            } else {
                continueFromResult();
                applyOperator(operator);
            }
        } else {
            clearIfJustEvaluated();
            if (item.textContent === '.') {
                if (currentSegmentHasDecimal()) {
                    updatePreview();
                    return;
                }
                // No digit typed yet for this number (start of expression, right
                // after an operator/open-paren/sign), or the previous token is a
                // sealed value (closed group or constant) -> needs a fresh "0."
                // and possibly an implicit multiply, e.g. "(5)" + "." -> "(5)*0.".
                const startsFresh = lastType === null || lastType === 'operator' || lastType === 'open-paren' || lastType === 'sign' || lastType === 'close-paren' || lastType === 'constant';
                const needsImplicitMultiply = lastType === 'close-paren' || lastType === 'constant';
                const insertion = (needsImplicitMultiply ? '*' : '') + (startsFresh ? '0.' : '.');
                if (display.textContent.length <= MAX_LENGTH - insertion.length) {
                    display.textContent += insertion;
                    lastType = 'decimal';
                }
            } else {
                const needsImplicitMultiply = lastType === 'close-paren' || lastType === 'constant';
                const insertion = (needsImplicitMultiply ? '*' : '') + item.textContent;
                if (display.textContent.length <= MAX_LENGTH - insertion.length) {
                    display.textContent += insertion;
                    lastType = 'digit';
                }
            }
        }
        updatePreview();
    });
});

sciToggleBtn.addEventListener('click', () => {
    const isOpen = sciPanel.hidden;
    sciPanel.hidden = !isOpen;
    sciToggleBtn.setAttribute('aria-pressed', String(isOpen));
});

themeToggleBtn.addEventListener('click', () => {
    calculator.classList.toggle('dark');
    themeToggleBtn.classList.toggle('active');
});
