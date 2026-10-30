/**
 * ZCC Scientific Calculator — Full Engine
 *
 * Features:
 *  - Basic arithmetic (+, −, ×, ÷, mod)
 *  - Trigonometric (sin, cos, tan and inverses) with DEG/RAD toggle
 *  - Logarithmic (log₁₀, ln, eˣ, 10ˣ)
 *  - Powers & roots (x², x³, xʸ, √x, ∛x)
 *  - Factorial, nPr, nCr
 *  - Constants π, e
 *  - Utility (|x|, 1/x, %, ±, rand, floor, ceil, ANS)
 *  - Memory (MC, MR, MS, M+, M−)
 *  - Parentheses
 *  - Unit conversions (length, weight, temp, speed, area, volume, pressure, energy, data, time)
 *  - Base-N conversions (dec, hex, oct, bin)
 *  - Calculation history
 *  - Keyboard support
 */

(function () {
  'use strict';

  // ===== State =====
  let expression = '';
  let currentResult = '0';
  let lastAnswer = 0;
  let memory = 0;
  let hasMemory = false;
  let angleMode = 'deg'; // 'deg' | 'rad'
  let history = [];
  let awaitingSecondOperand = null; // for xʸ, nPr, nCr

  const $expr = document.getElementById('expression');
  const $result = document.getElementById('result');
  const $memInd = document.getElementById('memIndicator');

  // ===== Helpers =====
  function toRad(x) { return angleMode === 'deg' ? (x * Math.PI) / 180 : x; }
  function fromRad(x) { return angleMode === 'deg' ? (x * 180) / Math.PI : x; }

  function factorial(n) {
    if (n < 0) return NaN;
    if (n > 170) return Infinity;
    n = Math.round(n);
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  function permutation(n, r) {
    n = Math.round(n); r = Math.round(r);
    if (r > n || n < 0 || r < 0) return NaN;
    return factorial(n) / factorial(n - r);
  }

  function combination(n, r) {
    n = Math.round(n); r = Math.round(r);
    if (r > n || n < 0 || r < 0) return NaN;
    return factorial(n) / (factorial(r) * factorial(n - r));
  }

  function formatNumber(n) {
    if (typeof n !== 'number' || isNaN(n)) return 'Error';
    if (!isFinite(n)) return n > 0 ? '∞' : '-∞';
    if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toLocaleString('en-US');
    const s = n.toPrecision(12);
    return parseFloat(s).toString();
  }

  function safeEval(expr) {
    try {
      // Sanitize: only allow digits, operators, parens, dots
      let sanitized = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/mod/g, '%');
      // Validate: no letters remain (prevents injection)
      if (/[a-zA-Z]/.test(sanitized)) return NaN;
      // eslint-disable-next-line no-new-func
      const fn = new Function('return (' + sanitized + ')');
      const result = fn();
      return typeof result === 'number' ? result : NaN;
    } catch {
      return NaN;
    }
  }

  // ===== Display update =====
  function updateDisplay() {
    $expr.textContent = expression;
    $result.textContent = currentResult;
    $result.classList.toggle('error', currentResult === 'Error');
    $memInd.textContent = hasMemory ? 'M' : '';
  }

  function setResult(val) {
    if (typeof val === 'number') {
      currentResult = formatNumber(val);
    } else {
      currentResult = String(val);
    }
    updateDisplay();
  }

  function getDisplayValue() {
    const clean = currentResult.replace(/,/g, '').replace('−', '-');
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  }

  // ===== History =====
  function addHistory(expr, val) {
    history.unshift({ expr, val });
    if (history.length > 50) history.pop();
    renderHistory();
  }

  function renderHistory() {
    const $list = document.getElementById('historyList');
    if (history.length === 0) {
      $list.innerHTML = '<div class="history-empty">No calculations yet</div>';
      return;
    }
    $list.innerHTML = history.map(function (h) {
      return '<div class="history-item" data-val="' + h.val + '">' +
        '<span class="history-expr">' + h.expr + '</span>' +
        '<span class="history-val">' + h.val + '</span></div>';
    }).join('');

    var items = $list.querySelectorAll('.history-item');
    items.forEach(function (el) {
      el.addEventListener('click', function () {
        var v = el.getAttribute('data-val').replace(/,/g, '');
        expression = v;
        currentResult = el.getAttribute('data-val');
        updateDisplay();
      });
    });
  }

  // ===== Input handling =====
  function appendToExpression(ch) {
    expression += ch;
    // Live-evaluate as user types
    const val = safeEval(expression);
    if (!isNaN(val) && isFinite(val)) {
      currentResult = formatNumber(val);
    }
    updateDisplay();
  }

  function handleAction(action) {
    const val = getDisplayValue();

    switch (action) {
      // ---- Numbers & decimal ----
      case '0': case '1': case '2': case '3': case '4':
      case '5': case '6': case '7': case '8': case '9':
      case '.':
        if (awaitingSecondOperand) {
          // We finished entering second operand — handle later at '='
        }
        appendToExpression(action);
        break;

      // ---- Operators ----
      case '+': case '-': case '×': case '÷':
        appendToExpression(' ' + action + ' ');
        break;
      case 'mod':
        appendToExpression(' mod ');
        break;
      case 'open':
        appendToExpression('(');
        break;
      case 'close':
        appendToExpression(')');
        break;

      // ---- Clear ----
      case 'clear':
        expression = '';
        currentResult = '0';
        awaitingSecondOperand = null;
        updateDisplay();
        break;
      case 'backspace':
        expression = expression.trimEnd();
        if (expression.endsWith('mod')) {
          expression = expression.slice(0, -3).trimEnd();
        } else {
          expression = expression.slice(0, -1).trimEnd();
        }
        if (expression === '') {
          currentResult = '0';
        } else {
          const v = safeEval(expression);
          if (!isNaN(v) && isFinite(v)) currentResult = formatNumber(v);
        }
        updateDisplay();
        break;

      // ---- Equals ----
      case '=':
        if (awaitingSecondOperand) {
          const second = getDisplayValue();
          let res;
          if (awaitingSecondOperand.op === 'xy') {
            res = Math.pow(awaitingSecondOperand.val, second);
          } else if (awaitingSecondOperand.op === 'nPr') {
            res = permutation(awaitingSecondOperand.val, second);
          } else if (awaitingSecondOperand.op === 'nCr') {
            res = combination(awaitingSecondOperand.val, second);
          }
          const fullExpr = awaitingSecondOperand.display + expression;
          expression = '';
          awaitingSecondOperand = null;
          setResult(res);
          lastAnswer = typeof res === 'number' && isFinite(res) ? res : 0;
          addHistory(fullExpr, currentResult);
          break;
        }
        if (expression.trim() === '') break;
        var evaled = safeEval(expression);
        var exprStr = expression;
        expression = '';
        setResult(evaled);
        lastAnswer = typeof evaled === 'number' && isFinite(evaled) ? evaled : 0;
        addHistory(exprStr, currentResult);
        break;

      // ---- Trig ----
      case 'sin':
        setResult(Math.sin(toRad(val)));
        expression = 'sin(' + val + ')';
        addHistory(expression, currentResult);
        expression = '';
        break;
      case 'cos':
        setResult(Math.cos(toRad(val)));
        expression = 'cos(' + val + ')';
        addHistory(expression, currentResult);
        expression = '';
        break;
      case 'tan':
        setResult(Math.tan(toRad(val)));
        expression = 'tan(' + val + ')';
        addHistory(expression, currentResult);
        expression = '';
        break;
      case 'asin':
        setResult(fromRad(Math.asin(val)));
        expression = 'sin⁻¹(' + val + ')';
        addHistory(expression, currentResult);
        expression = '';
        break;
      case 'acos':
        setResult(fromRad(Math.acos(val)));
        expression = 'cos⁻¹(' + val + ')';
        addHistory(expression, currentResult);
        expression = '';
        break;
      case 'atan':
        setResult(fromRad(Math.atan(val)));
        expression = 'tan⁻¹(' + val + ')';
        addHistory(expression, currentResult);
        expression = '';
        break;

      // ---- Log / Exp ----
      case 'log':
        setResult(Math.log10(val));
        expression = 'log(' + val + ')';
        addHistory(expression, currentResult);
        expression = '';
        break;
      case 'ln':
        setResult(Math.log(val));
        expression = 'ln(' + val + ')';
        addHistory(expression, currentResult);
        expression = '';
        break;
      case 'exp':
        setResult(Math.exp(val));
        expression = 'e^(' + val + ')';
        addHistory(expression, currentResult);
        expression = '';
        break;
      case '10x':
        setResult(Math.pow(10, val));
        expression = '10^(' + val + ')';
        addHistory(expression, currentResult);
        expression = '';
        break;

      // ---- Powers & Roots ----
      case 'x2':
        setResult(val * val);
        expression = '(' + val + ')²';
        addHistory(expression, currentResult);
        expression = '';
        break;
      case 'x3':
        setResult(val * val * val);
        expression = '(' + val + ')³';
        addHistory(expression, currentResult);
        expression = '';
        break;
      case 'xy':
        awaitingSecondOperand = { op: 'xy', val: val, display: val + '^' };
        expression = '';
        currentResult = val + '^';
        updateDisplay();
        break;
      case 'sqrt':
        setResult(Math.sqrt(val));
        expression = '√(' + val + ')';
        addHistory(expression, currentResult);
        expression = '';
        break;
      case 'cbrt':
        setResult(Math.cbrt(val));
        expression = '∛(' + val + ')';
        addHistory(expression, currentResult);
        expression = '';
        break;

      // ---- Combinatorics ----
      case 'fact':
        setResult(factorial(val));
        expression = val + '!';
        addHistory(expression, currentResult);
        expression = '';
        break;
      case 'nPr':
        awaitingSecondOperand = { op: 'nPr', val: val, display: val + ' P ' };
        expression = '';
        currentResult = val + ' P _';
        updateDisplay();
        break;
      case 'nCr':
        awaitingSecondOperand = { op: 'nCr', val: val, display: val + ' C ' };
        expression = '';
        currentResult = val + ' C _';
        updateDisplay();
        break;

      // ---- Constants ----
      case 'pi':
        expression += Math.PI.toString();
        currentResult = formatNumber(Math.PI);
        updateDisplay();
        break;
      case 'e':
        expression += Math.E.toString();
        currentResult = formatNumber(Math.E);
        updateDisplay();
        break;

      // ---- Utility ----
      case 'abs':
        setResult(Math.abs(val));
        expression = '|' + val + '|';
        addHistory(expression, currentResult);
        expression = '';
        break;
      case 'inv':
        setResult(1 / val);
        expression = '1/(' + val + ')';
        addHistory(expression, currentResult);
        expression = '';
        break;
      case 'pct':
        setResult(val / 100);
        expression = val + '%';
        addHistory(expression, currentResult);
        expression = '';
        break;
      case 'toggle':
        setResult(-val);
        expression = expression ? expression : String(-val);
        updateDisplay();
        break;
      case 'rand':
        var rnd = Math.random();
        setResult(rnd);
        expression = '';
        break;
      case 'floor':
        setResult(Math.floor(val));
        expression = '⌊' + val + '⌋';
        addHistory(expression, currentResult);
        expression = '';
        break;
      case 'ceil':
        setResult(Math.ceil(val));
        expression = '⌈' + val + '⌉';
        addHistory(expression, currentResult);
        expression = '';
        break;
      case 'ans':
        expression += lastAnswer.toString();
        currentResult = formatNumber(lastAnswer);
        updateDisplay();
        break;

      // ---- Memory ----
      case 'mc':
        memory = 0; hasMemory = false;
        updateDisplay();
        break;
      case 'mr':
        expression = memory.toString();
        setResult(memory);
        break;
      case 'ms':
        memory = val; hasMemory = true;
        updateDisplay();
        break;
      case 'm+':
        memory += val; hasMemory = true;
        updateDisplay();
        break;
      case 'm-':
        memory -= val; hasMemory = true;
        updateDisplay();
        break;
    }
  }

  // ===== Wire up buttons =====
  document.querySelectorAll('[data-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      handleAction(btn.getAttribute('data-action'));
    });
  });

  // ===== Angle mode ====
  document.querySelectorAll('.mode-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.mode-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      angleMode = tab.getAttribute('data-mode');
    });
  });

  // ===== Tab switching =====
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('panel-' + tab.getAttribute('data-panel')).classList.add('active');
    });
  });

  // ===== History toggle =====
  document.getElementById('historyBtn').addEventListener('click', function () {
    document.getElementById('historyPanel').classList.toggle('open');
  });

  // ===== Keyboard support =====
  document.addEventListener('keydown', function (e) {
    const key = e.key;
    if (key >= '0' && key <= '9') handleAction(key);
    else if (key === '.') handleAction('.');
    else if (key === '+') handleAction('+');
    else if (key === '-') handleAction('-');
    else if (key === '*') handleAction('×');
    else if (key === '/') { e.preventDefault(); handleAction('÷'); }
    else if (key === '%') handleAction('pct');
    else if (key === '(') handleAction('open');
    else if (key === ')') handleAction('close');
    else if (key === 'Enter' || key === '=') handleAction('=');
    else if (key === 'Backspace') handleAction('backspace');
    else if (key === 'Escape') handleAction('clear');
  });

  // ===== Unit Conversion =====
  var conversionData = {
    length: {
      units: ['m', 'km', 'cm', 'mm', 'mi', 'yd', 'ft', 'in', 'nm'],
      toBase: { m:1, km:1000, cm:0.01, mm:0.001, mi:1609.344, yd:0.9144, ft:0.3048, in:0.0254, nm:1e-9 }
    },
    weight: {
      units: ['kg', 'g', 'mg', 'lb', 'oz', 'ton', 'st'],
      toBase: { kg:1, g:0.001, mg:1e-6, lb:0.453592, oz:0.0283495, ton:1000, st:6.35029 }
    },
    temperature: {
      units: ['°C', '°F', 'K'],
      custom: true
    },
    speed: {
      units: ['m/s', 'km/h', 'mph', 'kn', 'ft/s'],
      toBase: { 'm/s':1, 'km/h':0.277778, 'mph':0.44704, 'kn':0.514444, 'ft/s':0.3048 }
    },
    area: {
      units: ['m²', 'km²', 'cm²', 'ha', 'ac', 'ft²', 'in²'],
      toBase: { 'm²':1, 'km²':1e6, 'cm²':1e-4, 'ha':1e4, 'ac':4046.86, 'ft²':0.092903, 'in²':6.4516e-4 }
    },
    volume: {
      units: ['L', 'mL', 'm³', 'gal', 'qt', 'pt', 'cup', 'fl oz'],
      toBase: { 'L':1, 'mL':0.001, 'm³':1000, 'gal':3.78541, 'qt':0.946353, 'pt':0.473176, 'cup':0.236588, 'fl oz':0.0295735 }
    },
    pressure: {
      units: ['Pa', 'kPa', 'bar', 'atm', 'psi', 'mmHg'],
      toBase: { 'Pa':1, 'kPa':1000, 'bar':1e5, 'atm':101325, 'psi':6894.76, 'mmHg':133.322 }
    },
    energy: {
      units: ['J', 'kJ', 'cal', 'kcal', 'Wh', 'kWh', 'eV', 'BTU'],
      toBase: { 'J':1, 'kJ':1000, 'cal':4.184, 'kcal':4184, 'Wh':3600, 'kWh':3.6e6, 'eV':1.602e-19, 'BTU':1055.06 }
    },
    data: {
      units: ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'bit'],
      toBase: { 'B':1, 'KB':1024, 'MB':1048576, 'GB':1073741824, 'TB':1099511627776, 'PB':1125899906842624, 'bit':0.125 }
    },
    time: {
      units: ['s', 'ms', 'min', 'h', 'day', 'week', 'year'],
      toBase: { 's':1, 'ms':0.001, 'min':60, 'h':3600, 'day':86400, 'week':604800, 'year':31557600 }
    }
  };

  function populateUnits(category) {
    var data = conversionData[category];
    var fromSel = document.getElementById('convertFromUnit');
    var toSel = document.getElementById('convertToUnit');
    fromSel.innerHTML = '';
    toSel.innerHTML = '';
    data.units.forEach(function (u) {
      fromSel.innerHTML += '<option value="' + u + '">' + u + '</option>';
      toSel.innerHTML += '<option value="' + u + '">' + u + '</option>';
    });
    if (data.units.length > 1) toSel.selectedIndex = 1;
  }

  function convertTemperature(val, from, to) {
    // Convert to Celsius first
    var c;
    if (from === '°C') c = val;
    else if (from === '°F') c = (val - 32) * 5/9;
    else c = val - 273.15; // K

    if (to === '°C') return c;
    if (to === '°F') return c * 9/5 + 32;
    return c + 273.15; // K
  }

  function doConversion() {
    var cat = document.getElementById('convertCategory').value;
    var fromVal = parseFloat(document.getElementById('convertFrom').value) || 0;
    var fromUnit = document.getElementById('convertFromUnit').value;
    var toUnit = document.getElementById('convertToUnit').value;
    var data = conversionData[cat];
    var result;

    if (data.custom) {
      result = convertTemperature(fromVal, fromUnit, toUnit);
    } else {
      var baseVal = fromVal * data.toBase[fromUnit];
      result = baseVal / data.toBase[toUnit];
    }

    document.getElementById('convertTo').value = result.toPrecision(10).replace(/\.?0+$/, '');
  }

  document.getElementById('convertCategory').addEventListener('change', function () {
    populateUnits(this.value);
  });
  document.getElementById('convertBtn').addEventListener('click', doConversion);
  document.getElementById('convertFrom').addEventListener('input', doConversion);
  document.getElementById('convertFromUnit').addEventListener('change', doConversion);
  document.getElementById('convertToUnit').addEventListener('change', doConversion);

  populateUnits('length');

  // ===== Base-N Conversion =====
  function doBaseConversion() {
    var inputType = document.getElementById('baseInputType').value;
    var raw = document.getElementById('baseInput').value.trim();
    var num;

    try {
      if (inputType === 'dec') num = parseInt(raw, 10);
      else if (inputType === 'hex') num = parseInt(raw, 16);
      else if (inputType === 'oct') num = parseInt(raw, 8);
      else if (inputType === 'bin') num = parseInt(raw, 2);
    } catch (e) { num = NaN; }

    if (isNaN(num)) {
      document.getElementById('baseDec').textContent = 'Invalid';
      document.getElementById('baseHex').textContent = '-';
      document.getElementById('baseOct').textContent = '-';
      document.getElementById('baseBin').textContent = '-';
      return;
    }

    document.getElementById('baseDec').textContent = num.toString(10);
    document.getElementById('baseHex').textContent = num.toString(16).toUpperCase();
    document.getElementById('baseOct').textContent = num.toString(8);
    document.getElementById('baseBin').textContent = num.toString(2);
  }

  document.getElementById('baseConvertBtn').addEventListener('click', doBaseConversion);
  document.getElementById('baseInput').addEventListener('input', doBaseConversion);
  document.getElementById('baseInputType').addEventListener('change', doBaseConversion);

  // Hex pad buttons
  document.querySelectorAll('.hex-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var inp = document.getElementById('baseInput');
      inp.value += btn.getAttribute('data-hex');
      doBaseConversion();
    });
  });

  // Initialize display
  updateDisplay();
})();
