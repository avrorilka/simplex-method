const LE = "≤";
const EQ = "=";
const GE = "≥";
const MAX = "max";
const MIN = "min";
const NEGATIVE_BASIS = false;
let varsBox = document.getElementById("varsBox");
let restrBox = document.getElementById("restrBox");
let funcBox = document.getElementById("function");
let restrictionsBox = document.getElementById("restrictions");
let solveBox = document.getElementById("simplex-solve");
let modeBox = document.getElementById("mode");
let printMode = 1;
let historyValues = null;

function SetInputFilter(textbox, inputFilter) {
    ["input", "keydown", "keyup", "mousedown", "mouseup", "select", "contextmenu"].forEach(function (event) {
        textbox.addEventListener(event, function () {
            if (inputFilter(this.value)) {
                this.oldValue = this.value;
                this.oldSelectionStart = this.selectionStart;
                this.oldSelectionEnd = this.selectionEnd;
            } else if (this.hasOwnProperty("oldValue")) {
                this.value = this.oldValue;
                this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
            }
        });
    });
}

function InputFilter(value) {
    return /^-?\d*([\.\/]\d*)?$/.test(value);
}

function IniFunctionBox(n) {
    while (funcBox.children.length > 0)
        funcBox.children[0].remove();

    for (let i = 0; i < n; i++) {
        let elem = document.createElement("input");
        elem.style.width = "45px";
        elem.id = "var" + i;
        elem.placeholder = "0";
        elem.inputMode = 'numeric';
        elem.autocomplete = 'off';

        let name = document.createElement("span");
        name.innerHTML = " x<sub>" + (i + 1) + "</sub> " + (i == n - 1 ? "" : "+ ");
        funcBox.appendChild(elem);
        funcBox.appendChild(name);
    }
}

function InitRestrictions(n, m) {
    while (restrictionsBox.children.length > 0)
        restrictionsBox.children[0].remove();

    for (let i = 0; i < m; i++) {
        let rest = document.createElement("div");
        rest.id = "rest-" + i + "-box";
        rest.className = "restriction-div";

        for (let j = 0; j < n; j++) {
            let elem = document.createElement("input");
            elem.style.width = "45px";
            elem.id = "rest-" + i + "-" + j;
            elem.placeholder = "0";
            elem.inputMode = 'numeric';
            elem.autocomplete = 'off';

            let name = document.createElement("span");
            name.innerHTML = " x<sub>" + (j + 1) + "</sub> " + (j == n - 1 ? "" : "+ ");

            rest.appendChild(elem);
            rest.appendChild(name);
        }

        let select = document.createElement("select");
        select.id = "cond-" + i;
        let options = [LE, EQ, GE];

        for (let j = 0; j < options.length; j++) {
            let option = document.createElement("option");
            option.text = options[j];
            option.value = options[j];
            select.appendChild(option);
        }

        rest.appendChild(select);

        let elem = document.createElement("input");
        elem.style.width = "45px";
        elem.id = "rest-" + i + "-value";
        elem.style.textAlign = "left";
        elem.placeholder = "0";
        elem.inputMode = 'numeric';
        elem.autocomplete = 'off';
        rest.innerHTML += " ";
        rest.appendChild(elem);
        restrictionsBox.appendChild(rest);
    }

    let names = document.createElement("span");

    for (let i = 0; i < n - 1; i++)
        names.innerHTML += "x<sub>" + (i + 1) + "</sub>, ";

    names.innerHTML += "x<sub>" + n + "</sub> &ge; 0";

    let block = document.getElementById("rest-vars");

    while (block.children.length > 0)
        block.children[0].remove();

    block.appendChild(names);

}

function MoveCell(cell, e) {
    let id = cell.id;
    let n = +varsBox.value;
    let m = +restrBox.value;
    var text = cell.value;
    var start = cell.selectionStart;
    var end = cell.selectionEnd;
    var min = Math.min(start, end);
    var max = Math.max(start, end);

    if (id.substr(0, 3) == "var") {
        let index = +id.substr(3);

        if (e.key == "ArrowRight")
            index = (index + 1) % n;
        else if (e.key == "ArrowLeft")
            index = (index - 1 + n) % n;

        id = "var" + index;

    } else {
        let args = id.split('-');
        let row = +args[1];
        let column = args[2] == "value" ? n : +args[2];
        let index = row * (n + 1) + column;
        let total = (n + 1) * m;

        if (e.key == "ArrowRight" && max == text.length) {
            index = (index + 1) % total;
        } else if (e.key == "ArrowLeft" && min == 0) {
            index = (index - 1 + total) % total;
        } else if (e.key == "ArrowDown") {
            row++;
            column = (column + Math.floor(row / m)) % (n + 1);
            row = row % m;
            index = row * (n + 1) + column;
        } else if (e.key == "ArrowUp") {
            row--;
            column = (column - (row == -1 ? 1 : 0) + n + 1) % (n + 1);
            row = (row + m) % m;
            index = row * (n + 1) + column;
        }

        row = Math.floor(index / (n + 1));
        column = index % (n + 1);

        if (column < n) {
            id = "rest-" + row + "-" + column;
        } else {
            id = "rest-" + row + "-value";
        }
    }

    if (cell.id == id)
        return;

    let elem = document.getElementById(id);
    elem.focus();
    text = elem.value;

    if (e.key == "ArrowLeft") {
        elem.selectionStart = text.length;
        elem.selectionEnd = text.length;
    } else {
        elem.selectionStart = 0;
        elem.selectionEnd = 0;
    }
}

function SaveValues() {
    let func = [];
    for (let i = 0; i < funcBox.children.length; i += 2)
        func.push(funcBox.children[i].value);

    let restrictions = [];
    let free = [];

    for (let i = 0; i < restrictionsBox.children.length; i++) {
        restrictions[i] = [];

        for (let j = 0; j < restrictionsBox.children[i].children.length - 2; j += 2)
            restrictions[i].push(restrictionsBox.children[i].children[j].value);

        free.push(restrictionsBox.children[i].children[restrictionsBox.children[i].children.length - 1].value);
    }

    return {
        func: func,
        restrictions: restrictions,
        free: free
    };
}

function InitTable() {
    if (varsBox.value == "" || restrBox.value == "")
        return;

    let n = +varsBox.value;
    let m = +restrBox.value;

    if (n < 1 || m < 1)
        return;

    historyValues = SaveValues();
    IniFunctionBox(n);
    InitRestrictions(n, m);

    for (let i = 0; i < n; i++) {
        let func = document.getElementById("var" + i);
        SetInputFilter(func, InputFilter);
        func.addEventListener('keydown', (event) => {
            MoveCell(func, event);
        }, false);
        if (i < historyValues.func.length && historyValues.func[i] != "")
            func.value = historyValues.func[i];
    }

    for (let i = 0; i < m; i++) {
        let value = document.getElementById("rest-" + i + "-value");
        SetInputFilter(value, InputFilter);
        value.addEventListener('keydown', (event) => {
            MoveCell(value, event);
        }, false);

        if (i < historyValues.free.length && historyValues.free[i] != "")
            value.value = historyValues.free[i];

        for (let j = 0; j < n; j++) {
            let rest = document.getElementById("rest-" + i + "-" + j);
            SetInputFilter(rest, InputFilter);
            rest.addEventListener('keydown', (event) => {
                MoveCell(rest, event);
            }, false);

            if (i < historyValues.restrictions.length && j < historyValues.restrictions[i].length && historyValues.restrictions[i][j] != "")
                rest.value = historyValues.restrictions[i][j];
        }
    }
}

function Clear() {
    let n = +varsBox.value;
    let m = +restrBox.value;

    for (let i = 0; i < n; i++)
        document.getElementById("var" + i).value = "";

    for (let i = 0; i < m; i++) {
        document.getElementById("rest-" + i + "-value").value = "";

        for (let j = 0; j < n; j++)
            document.getElementById("rest-" + i + "-" + j).value = "";
    }

    solveBox.innerHTML = "";
}

function GetFunctionCoefficients(n) {
    let func = [];

    for (let i = 0; i < n; i++) {
        let field = document.getElementById("var" + i);

        try {
            func.push(new Fraction(field.value));
        } catch (e) {
            field.focus();
            throw e;
        }
    }

    return func;
}

function GetRestrictCoefficients(n, m) {
    let restricts = [];

    for (let i = 0; i < m; i++) {
        restricts[i] = {
            values: [],
            sign: document.getElementById("cond-" + i).value,
        };

        for (let j = 0; j < n; j++) {
            let field = document.getElementById("rest-" + i + "-" + j);

            try {
                restricts[i].values.push(new Fraction(field.value));
            } catch (e) {
                field.focus();
                throw e;
            }
        }

        let field = document.getElementById("rest-" + i + "-value");

        try {
            restricts[i].b = new Fraction(field.value);
        } catch (e) {
            field.focus();
            throw e;
        }
    }

    return restricts;
}

function PrintFunction(func) {
    let html = "";
    let start = false;

    for (let i = 0; i < func.length; i++) {

        if (!func[i].n.isZero()) {

            if (start && func[i].isPos()) {
                html += "+ ";
            }

            if (func[i].isNeg()) {
                if (func[i].abs().isOne())
                    html += "- ";
                else
                    html += "- " + func[i].abs().print(printMode) + "·";
            } else {
                if (!func[i].isOne())
                    html += func[i].print(printMode) + "·";
            }

            html += "x<sub>" + (i + 1) + "</sub> ";

            start = true;
        }
    }

    if (!start)
        html += "0";

    return html;
}

function ChangeSigns(restricts) {
    let have = false;

    for (let i = 0; i < restricts.length; i++) {
        if (restricts[i].sign == GE) {
            restricts[i].sign = LE;

            for (let j = 0; j < restricts[i].values.length; j++)
                restricts[i].values[j].changeSign();

            restricts[i].b.changeSign();
            have = true;
        }
    }

    return "";
}

function PrepareTable(n, m, func, restricts, mode) {
    let k = 0;

    for (let i = 0; i < restricts.length; i++)
        if (restricts[i].sign != EQ)
            k++;

    let simplex = {
        n: n,
        m: m,
        total: n + k,
        mode: mode,
        table: [],
        b: [],
        basis: [],
        C: [],
        deltas: [],
        Q: []
    };

    let html = "";

    for (let i = 0; i < n; i++)
        simplex.C.push(func[i]);

    for (let i = 0; i < k; i++)
        simplex.C.push(new Fraction());

    simplex.C.push(new Fraction("0"));

    let index = 0;
    let unknown = -1;
    let systemHtml = "";

    for (let i = 0; i < m; i++) {
        simplex.table[i] = [];

        for (let j = 0; j < n; j++)
            simplex.table[i].push(restricts[i].values[j]);

        let inserted = false;

        if (restricts[i].sign == EQ) {
            simplex.basis.push(unknown);
            unknown--;
        }

        for (let j = 0; j < k; j++) {
            if (restricts[i].sign == EQ) {
                simplex.table[i].push(new Fraction("0"));
            } else if (!NEGATIVE_BASIS || restricts[i].sign == LE) {

                if (j != index || inserted) {
                    simplex.table[i].push(new Fraction("0"));
                } else if (!inserted) {
                    simplex.table[i].push(new Fraction("1"));
                    simplex.basis.push(n + index);
                    index++;
                    inserted = true;
                }
            } else if (NEGATIVE_BASIS) {
                if (j != index || inserted) {
                    simplex.table[i].push(new Fraction("0"));
                } else if (!inserted) {
                    simplex.table[i].push(new Fraction("-1"));
                    index++;
                    inserted = true;
                }
            }
        }

        simplex.b[i] = restricts[i].b;
        systemHtml += PrintFunction(simplex.table[i]) + " = " + simplex.b[i].print(printMode) + "<br>";
    }

    unknown = -1;

    for (let i = 0; i < m; i++) {
        if (simplex.basis[i] > -1)
            continue;

        let column = GetIdentityColumn(simplex, i);

        if (column == -1) {
            simplex.basis[i] = unknown--;
        } else {
            simplex.basis[i] = column;
        }
    }

    return {
        simplex: simplex,
        html: html
    };
}

function CheckBasis(simplex) {
    for (let i = 0; i < simplex.m; i++)
        if (simplex.basis[i] < 0)
            return false;

    return true;
}

function MakeVarBasis(simplex, row, column, print = false) {
    let html = "";

    simplex.basis[row] = column;
    if (print)
        html += PrintTable(simplex, row, column);
    let x = simplex.table[row][column];

    DivRow(simplex, row, x);
    SubRows(simplex, row, column);

    return html;
}

function IsBasisVar(simplex, index) {
    for (let i = 0; i < simplex.basis.length; i++)
        if (index == simplex.basis[i])
            return true;

    return false;
}

function IsRowZero(simplex, row) {
    if (!simplex.b[row].isZero())
        return false;

    for (let j = 0; j < simplex.total; j++)
        if (!simplex.table[row][j].isZero())
            return false;

    return true;
}

function IsColumnOne(simplex, column, row) {
    for (let i = 0; i < simplex.m; i++) {

        if (i != row && !simplex.table[i][column].isZero())
            return false;

        if (i == row && !simplex.table[i][column].isOne())
            return false;
    }

    return true;
}

function IsColumnBasis(simplex, column, row) {
    for (let i = 0; i < simplex.m; i++) {
        if (i != row && !simplex.table[i][column].isZero())
            return false;

        if (i == row && simplex.table[i][column].isZero())
            return false;
    }

    return true;
}

function GetIdentityColumn(simplex, row) {
    for (let j = 0; j < simplex.total; j++)
        if (IsColumnOne(simplex, j, row))
            return j;

    return -1;
}

function GetBasisColumn(simplex, row) {
    for (let j = 0; j < simplex.total; j++)
        if (IsColumnBasis(simplex, j, row))
            return j;

    return -1;
}

function RemoveZeroRow(simplex, row) {
    simplex.table.splice(row, 1);
    simplex.b.splice(row, 1);
    simplex.basis.splice(row, 1);
    simplex.basis.splice(row, 1);
    simplex.m--;
}

function FindBasis(simplex) {
    let html = "<b>Шукаємо базис</b><br>";

    for (let i = 0; i < simplex.basis.length; i++) {
        if (simplex.basis[i] > -1)
            continue;
        let column = GetBasisColumn(simplex, i);

        if (column > -1) {
            DivRow(simplex, i, simplex.table[i][column]);
            simplex.basis[i] = column;
        } else {
            column = 0;

            while (column < simplex.total) {
                if (IsBasisVar(simplex, column) || simplex.table[i][column].isZero()) {
                    column++;
                } else {
                    break;
                }
            }

            if (column == simplex.total) {
                if (IsRowZero(simplex, i)) {
                    RemoveZeroRow(simplex, i);
                    html += "Оновлена симплекс-таблиця:";
                    html += PrintTable(simplex);
                    i--;
                    continue;
                } else {
                    html += "<br><b>Таблиця:</b>";
                    html += PrintTable(simplex);
                    return html + "<br>Виявлено суперечливу умову. <b>Рішення не існує</b>";
                }
            }
            html += MakeVarBasis(simplex, i, column, true);
        }
    }

    html += "<br><b>Таблиця:</b>";
    html += PrintTable(simplex);
    html += "<br>";
    return html;
}

function MaxAbsB(simplex) {
    let imax = -1;

    for (let i = 0; i < simplex.m; i++) {

        if (!simplex.b[i].isNeg())
            continue;

        if (imax == -1 || (simplex.b[i].abs().gt(simplex.b[imax].abs())))
            imax = i;
    }

    return imax;
}

function MaxAbsIndex(simplex, row) {
    let jmax = -1;

    for (let j = 0; j < simplex.total; j++) {

        if (!simplex.table[row][j].isNeg())
            continue;

        if (jmax == -1 || (simplex.table[row][j].abs().gt(simplex.table[row][jmax].abs())))
            jmax = j;
    }

    return jmax;
}

function RemoveNegativeB(simplex) {
    let row = MaxAbsB(simplex);
    let column = MaxAbsIndex(simplex, row);
    let html = "";

    if (column == -1) {
        html += "У рядку " + (row + 1) + " відсутні негативні значення. Розв'язання задачі не існує.";
        return html;
    }
    html += MakeVarBasis(simplex, row, column);
    html += "<br><b>Оновлена таблиця:</b>";
    html += PrintTable(simplex, row, column);
    return html;
}

function HaveNegativeB(simplex) {
    for (let i = 0; i < simplex.m; i++)
        if (simplex.b[i].isNeg())
            return true;

    return false;
}

function CheckSolveNegativeB(simplex) {
    let row = MaxAbsB(simplex);

    return MaxAbsIndex(simplex, row) > -1;
}

function CalculateDeltas(simplex) {
    for (let j = 0; j < simplex.total; j++) {
        let delta = new Fraction("0");
        for (let i = 0; i < simplex.m; i++)
            delta = delta.add(simplex.C[simplex.basis[i]].mult(simplex.table[i][j]));
        simplex.deltas[j] = delta.sub(simplex.C[j]);
    }
    let delta = new Fraction("0");
    for (let i = 0; i < simplex.m; i++)
        delta = delta.add(simplex.C[simplex.basis[i]].mult(simplex.b[i]));
    simplex.deltas[simplex.total] = delta.sub(simplex.C[simplex.total]);
}

function CalculateDeltasSolve(simplex) {
    let html = "";
    html += "&Delta;<sub>i</sub> = ";
    for (let i = 0; i < simplex.m; i++) {
        html += "C<sub>" + (1 + simplex.basis[i]) + "</sub>·a<sub>" + (i + 1) + "i</sub>";
        if (i < simplex.m - 1)
            html += " + ";
    }
    html += " - C<sub>i</sub><br>";
    let hint = "";
    for (let j = 0; j < simplex.total; j++) {
        let formula = "&Delta;<sub>" + (j + 1) + "</sub> = ";
        let delta = "";
        for (let i = 0; i < simplex.m; i++) {
            formula += "C<sub>" + (simplex.basis[i] + 1) + "</sub>·a<sub>" + (i + 1) + (j + 1) + "</sub>";
            delta += simplex.C[simplex.basis[i]].print(printMode) + "·" + simplex.table[i][j].printNg(printMode);
            if (i < simplex.m - 1) {
                delta += " + ";
                formula += " + ";
            }
        }
        formula += " - C<sub>" + (j + 1) + "</sub>";
        delta += " - " + simplex.C[j].print(printMode);
        delta += " = " + simplex.deltas[j].print(printMode);
        hint += formula + " = " + delta + "<br>";
    }
    let formula = "&Delta;<sub>b</sub> = ";
    let delta = "";
    for (let i = 0; i < simplex.m; i++) {
        formula += "C<sub>" + (simplex.basis[i] + 1) + "</sub>·b<sub>" + (i + 1) + "</sub>";
        delta += simplex.C[simplex.basis[i]].print(printMode) + "·" + simplex.b[i].printNg(printMode);
        if (i < simplex.m - 1) {
            delta += " + ";
            formula += " + ";
        }
    }
    formula += " - C<sub>" + (simplex.total + 1) + "</sub>";
    delta += " - " + simplex.C[simplex.total].print(printMode);
    delta += " = " + simplex.deltas[simplex.total].print(printMode);
    hint += formula + " = " + delta;
    return html;
}

function CheckPlan(simplex) {
    for (let i = 0; i < simplex.total; i++) {
        if (simplex.mode == MAX && simplex.deltas[i].isNeg())
            return false;
        if (simplex.mode == MIN && simplex.deltas[i].isPos())
            return false;
    }
    return true;
}

function GetColumn(simplex) {
    let jmax = 0;

    for (let j = 1; j < simplex.total; j++) {
        if (simplex.mode == MAX && simplex.deltas[j].lt(simplex.deltas[jmax]))
            jmax = j;
        else if (simplex.mode == MIN && simplex.deltas[j].gt(simplex.deltas[jmax]))
            jmax = j;
    }

    return jmax;
}

function GetQandRow(simplex, j) {
    let imin = -1;

    for (let i = 0; i < simplex.m; i++) {
        simplex.Q[i] = null;

        if (simplex.table[i][j].isZero())
            continue;

        let q = simplex.b[i].div(simplex.table[i][j]);

        if (q.isNeg() || (simplex.b[i].isZero() && simplex.table[i][j].isNeg()))
            continue;

        simplex.Q[i] = q;

        if (imin == -1 || q.lt(simplex.Q[imin]))
            imin = i;
    }
    return imin;
}

function DivRow(simplex, row, value) {
    for (let j = 0; j < simplex.total; j++)
        simplex.table[row][j] = simplex.table[row][j].div(value);
    simplex.b[row] = simplex.b[row].div(value);
}

function SubRow(simplex, row1, row2, value) {
    for (let j = 0; j < simplex.total; j++)
        simplex.table[row1][j] = simplex.table[row1][j].sub(simplex.table[row2][j].mult(value));
    simplex.b[row1] = simplex.b[row1].sub(simplex.b[row2].mult(value));
}

function SubRows(simplex, row, column) {
    for (let i = 0; i < simplex.m; i++) {
        if (i == row)
            continue;
        SubRow(simplex, i, row, simplex.table[i][column]);
    }
}

function CalcFunction(simplex) {
    let F = new Fraction();
    let X = [];
    let html = "";

    for (let i = 0; i < simplex.m; i++)
        F = F.add(simplex.C[simplex.basis[i]].mult(simplex.b[i]));

    for (let i = 0; i < simplex.total; i++) {
        html += simplex.C[i].print(printMode) + "·";
        let index = simplex.basis.indexOf(i);

        if (index == -1) {
            html += "0 ";
            X.push("0");
        } else {
            html += simplex.b[index].printNg(printMode) + " ";
            X.push(simplex.b[index].print(printMode));
        }

        if (i < simplex.total - 1)
            html += "+ ";
    }

    return {
        result: F,
        plan: "[ " + X.join(", ") + " ]",
        solve: html
    };
}

function PrintTable(simplex, row = -1, col = -1) {
    let html = "<br>";

    html += "<table class='simplex-table'>";
    html += "<tr><td><b>C</b></td>";

    for (let i = 0; i < simplex.C.length; i++)
        html += "<td>" + simplex.C[i].print(printMode) + "</td>";

    html += "</tr>";
    html += "<tr><th>Базис</th>";

    for (let i = 0; i < simplex.total; i++)
        html += "<th>x<sub>" + (i + 1) + "</sub></th>";

    html += "<th>b</th>";

    if (simplex.Q.length > 0)
        html += "<th>Q</th>";

    html += "</tr>";

    for (let i = 0; i < simplex.m; i++) {
        if (simplex.basis[i] < 0)
            html += "<tr><td><b><sub>" + (-simplex.basis[i]) + "</sub></b></td>";
        else
            html += "<tr><td><b>x<sub>" + (1 + simplex.basis[i]) + "</sub></b></td>";
        for (let j = 0; j < simplex.table[i].length; j++) {
            if (i == row && j == col)
                html += "<td class='row-col-cell'>";
            else if (i == row)
                html += "<td class='row-cell'>";
            else if (j == col)
                html += "<td class='col-cell'>";
            else
                html += "<td>";

            html += simplex.table[i][j].print(printMode);
            html += "</td>";
        }
        if (i == row)
            html += "<td class='row-cell'>";
        else
            html += "<td>";

        html += simplex.b[i].print(printMode) + "</td>";

        if (simplex.Q.length > 0) {
            if (simplex.Q[i] == null)
                html += "<td>-</td>";
            else if (col != -1) {
                html += "<td" + (i == row ? " class='row-cell'" : "") + ">" + simplex.b[i].print(printMode) + " / " + simplex.table[i][col].print(printMode) + " = " + simplex.Q[i].print(printMode) + "</td>";
            } else {
                html += "<td>" + simplex.Q[i].print(printMode) + "</td>";
            }
        }

        html += "</tr>";
    }

    if (simplex.deltas.length > 0) {
        html += "<tr><td><b>&Delta;</b></td>";
        for (let i = 0; i < simplex.deltas.length; i++)
            html += "<td>" + simplex.deltas[i].print(printMode) + "</td>";
        html += "</tr>";
    }

    html += "</table>";
    html += "<br>";

    return html;
}

function PrintAnswer(simplex) {
    let answer = "";

    for (let i = 0; i < simplex.n; i++) {
        let index = simplex.basis.indexOf(i);
        answer += "x<sub>" + (i + 1) + "</sub> = ";

        if (index == -1)
            answer += "0, ";
        else
            answer += simplex.b[index].print(printMode) + ", ";
    }

    let F = new Fraction();

    for (let i = 0; i < simplex.m; i++)
        F = F.add(simplex.C[simplex.basis[i]].mult(simplex.b[i]));

    answer += "F = " + F.print(printMode);

    return answer;
}

function InputToString(func, mode, restrictions) {
    let s = "f: ";

    for (let i = 0; i < func.length; i++)
        s += func[i].toString() + " ";

    s += mode + " ";

    for (let i = 0; i < restrictions.length; i++) {
        s += ", rest " + (i + 1) + ": [";

        for (let j = 0; j < restrictions[i].values.length; j++) {
            s += restrictions[i].values[j].toString() + " ";
        }

        s += restrictions[i].sign + " " + restrictions[i].b.toString() + "]";
    }

    return s;
}

function SolveTable(n, m, func, restricts, mode) {
    let html = "";

    if (!NEGATIVE_BASIS)
        html += ChangeSigns(restricts);

    let init = PrepareTable(n, m, func, restricts, mode);
    html += init.html;

    let simplex = init.simplex;
    html += "<b>Початкова симплекс-таблиця</b>";
    html += PrintTable(simplex);

    let res = true;
    if (!CheckBasis(simplex))
        html += FindBasis(simplex);

    if (!CheckBasis(simplex)) {
        return {
            answer: "Рішення задачі не існує.",
            solve: html
        };
    }

    while (HaveNegativeB(simplex) && res) {
        html += "У стовпці b є негативні значення<br>";
        res = CheckSolveNegativeB(simplex);
        html += RemoveNegativeB(simplex);
    }

    if (!res) {
        return {
            answer: "Рішення задачі не існує.",
            solve: html
        };
    }

    CalculateDeltas(simplex);
    CalculateDeltasSolve(simplex);

    html += "<b>Симплекс-таблиця з дельтами</b>";
    html += PrintTable(simplex);

    let iteration = 1;

    while (!CheckPlan(simplex)) {
        let column = GetColumn(simplex);

        let row = GetQandRow(simplex, column);
        if (row == -1) {
            html += PrintTable(simplex, -1, column);
            html += "<b>Функція не обмежена. Оптимальне рішення відсутнє</b>.<br>";
            return {
                answer: "Функція не обмежена. Оптимальне рішення відсутнє.",
                solve: html
            };
        }

        html += MakeVarBasis(simplex, row, column, true);
        CalculateDeltas(simplex);
        CalculateDeltasSolve(simplex);

        html += "<b>Симплекс-таблиця з оновленими дельтами</b>";
        html += PrintTable(simplex);

        let F = CalcFunction(simplex);
        html += "<b>Поточний план X:</b>" + F.plan + "<br>";
        html += "<b>Цільова функція F:</b> " + F.solve + " = " + F.result.print(printMode) + "<br>";

        iteration++;
    }
    if (HaveNegativeB(simplex)) {
        html += "У стовпці b присутні негативні значення. Рішення не існує.";
        return {
            answer: "У стовпці b є негативні значення. Рішення не існує.",
            solve: html
        };
    }
    html += "<b>Відповідь:</b> ";
    let answer = PrintAnswer(simplex);
    return {
        answer: answer,
        solve: html + answer + "<br>"
    };
}

function PrintAM(C, brackets = false) {
    if (C.a.isZero() && C.m.isZero())
        return "0";

    if (brackets) {
        if (C.a.isZero()) {
            if (C.m.abs().isOne())
                return C.m.isPos() ? "M" : "- M";
            return (C.m.isPos() ? C.m.print(printMode) : "- " + C.m.abs().print(printMode)) + "M";
        }
    }

    if (C.a.isZero()) {
        if (C.m.abs().isOne())
            return C.m.isPos() ? "M" : "-M";
        return C.m.print(printMode) + "M";
    }

    if (C.m.isZero())
        return C.a.print(printMode);

    let html = C.a.print(printMode);

    if (brackets)
        html += "(";

    if (C.m.isNeg())
        html += " - ";

    else
        html += " + ";

    if (C.m.abs().isOne())
        html += "M";

    else
        html += C.m.abs().print(printMode) + "M";

    if (brackets)
        html += ")";

    return html;
}

function Solve() {
    try {
        let n = +varsBox.value;
        let m = +restrBox.value;
        let mode = modeBox.value;
        let func = GetFunctionCoefficients(n);
        let restricts = GetRestrictCoefficients(n, m);
        let result;

        solveBox.innerHTML = "<h3>Вхідні дані: </h3>";
        solveBox.innerHTML += PrintFunction(func);
        solveBox.innerHTML += "-> " + mode + "<br>";

        for (let i = 0; i < m; i++) {
            solveBox.innerHTML += PrintFunction(restricts[i].values);
            solveBox.innerHTML += " " + restricts[i].sign + " ";
            solveBox.innerHTML += restricts[i].b.print(printMode);
            solveBox.innerHTML += "<br>";
        }

        solveBox.innerHTML += "</div>";

        result = SolveTable(n, m, func, restricts, mode);
        solveBox.innerHTML += "<h3>Рішення: </h3> " + result.solve;

    } catch (e) {
        alert("Помилка: " + e);
    }
}

InitTable();