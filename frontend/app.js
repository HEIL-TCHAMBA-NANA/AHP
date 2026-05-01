const API_URL = "http://127.0.0.1:8000/api/ahp/compute/";

let criteria = [];
let alternatives = [];

function generateStep2() {
  criteria = document.getElementById("criteriaInput").value
    .split(",").map(s => s.trim()).filter(s => s);
  alternatives = document.getElementById("alternativesInput").value
    .split(",").map(s => s.trim()).filter(s => s);

  if (criteria.length < 2 || alternatives.length < 2) {
    alert("Minimum 2 critères et 2 alternatives.");
    return;
  }

  // Tableau scores
  let html = "<table><thead><tr><th>Critère</th>";
  alternatives.forEach(a => html += `<th>${a}</th>`);
  html += "<th>Plus petit = meilleur</th></tr></thead><tbody>";

  criteria.forEach((c, i) => {
    html += `<tr><td class="label-cell">${c}</td>`;
    alternatives.forEach((a, j) => {
      html += `<td><input class="score-input" type="number" step="any" 
               id="score_${i}_${j}" placeholder="valeur"/></td>`;
    });
    html += `<td style="text-align:center">
               <input type="checkbox" id="lower_${i}"/>
             </td></tr>`;
  });

  html += "</tbody></table>";
  document.getElementById("scoresTable").innerHTML = html;
  document.getElementById("step2").classList.remove("hidden");
  document.getElementById("step2").scrollIntoView({ behavior: "smooth" });
}

function generateStep3() {
  // Valider que tous les scores sont remplis
  for (let i = 0; i < criteria.length; i++) {
    for (let j = 0; j < alternatives.length; j++) {
      const val = parseFloat(document.getElementById(`score_${i}_${j}`).value);
      if (isNaN(val) || val <= 0) {
        alert(`Score manquant : ${criteria[i]} / ${alternatives[j]}`);
        return;
      }
    }
  }

  buildMatrixTable("criteriaMatrix", criteria);
  document.getElementById("step3").classList.remove("hidden");
  document.getElementById("step3").scrollIntoView({ behavior: "smooth" });
}

function buildMatrixTable(containerId, labels) {
  const n = labels.length;
  let html = "<table><thead><tr><th></th>";
  labels.forEach(l => html += `<th>${l}</th>`);
  html += "</tr></thead><tbody>";

  labels.forEach((r, i) => {
    html += `<tr><td class="label-cell">${r}</td>`;
    labels.forEach((c, j) => {
      if (i === j) {
        html += `<td class="diagonal">1</td>`;
      } else if (i < j) {
        html += `<td><input class="matrix-input" type="number" step="any" min="0.01"
                   id="crit_${i}_${j}" placeholder="?"
                   oninput="mirrorValue(${i}, ${j})"/></td>`;
      } else {
        html += `<td><input class="matrix-input" type="number"
                   id="crit_${i}_${j}" readonly
                   style="background:#f7fafc;color:#718096"/></td>`;
      }
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  document.getElementById(containerId).innerHTML = html;
}

function mirrorValue(i, j) {
  const val = parseFloat(document.getElementById(`crit_${i}_${j}`).value);
  const mirror = document.getElementById(`crit_${j}_${i}`);
  if (mirror && !isNaN(val) && val > 0) {
    mirror.value = (1 / val).toFixed(4);
  }
}

function readCriteriaMatrix() {
  const n = criteria.length;
  const matrix = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) {
      if (i === j) { row.push(1); continue; }
      const val = parseFloat(document.getElementById(`crit_${i}_${j}`).value);
      if (isNaN(val) || val <= 0) return null;
      row.push(val);
    }
    matrix.push(row);
  }
  return matrix;
}

function readScores() {
  const scores = {};
  const lower_is_better = [];

  criteria.forEach((c, i) => {
    scores[c] = {};
    alternatives.forEach((a, j) => {
      scores[c][a] = parseFloat(document.getElementById(`score_${i}_${j}`).value);
    });
    if (document.getElementById(`lower_${i}`).checked) {
      lower_is_better.push(c);
    }
  });

  return { scores, lower_is_better };
}

async function computeAHP() {
  const criteriaMatrix = readCriteriaMatrix();
  if (!criteriaMatrix) {
    alert("Matrice des critères incomplète.");
    return;
  }

  const { scores, lower_is_better } = readScores();

  const payload = { criteria, alternatives, criteria_matrix: criteriaMatrix, scores, lower_is_better };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    displayResults(data);
  } catch (err) {
    alert("Erreur de connexion au backend : " + err.message);
  }
}

function displayResults(data) {
  const section = document.getElementById("results");
  const content = document.getElementById("resultsContent");
  section.classList.remove("hidden");

  if (!data.consistent) {
    content.innerHTML = `
      <div class="result-inconsistent">
        <h3>❌ Matrice incohérente</h3>
        <p style="margin-top:10px">${data.reason}</p>
        <div class="stats" style="margin-top:15px">
          <div class="stat-box"><span>λmax</span><strong>${data.lambda_max}</strong></div>
          <div class="stat-box"><span>CI</span><strong>${data.CI}</strong></div>
          <div class="stat-box"><span>RI</span><strong>${data.RI}</strong></div>
          <div class="stat-box"><span>CR</span><strong style="color:#c53030">${data.CR}</strong></div>
        </div>
        <p style="margin-top:10px;font-size:0.88rem;color:#718096">
          Veuillez réviser vos comparaisons pour obtenir CR &lt; 0.10.
        </p>
      </div>`;
    section.scrollIntoView({ behavior: "smooth" });
    return;
  }

  let weightsHTML = '<div class="criteria-weights">';
  for (const [k, v] of Object.entries(data.criteria_weights)) {
    weightsHTML += `<span class="weight-tag">${k} : ${(v * 100).toFixed(1)}%</span>`;
  }
  weightsHTML += '</div>';

  const maxScore = data.ranking[0].score;
  let rankHTML = '<div class="ranking">';
  data.ranking.forEach((item, idx) => {
    const badgeClass = idx === 0 ? "rank-1" : idx === 1 ? "rank-2" : idx === 2 ? "rank-3" : "rank-other";
    const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1;
    const pct = ((item.score / maxScore) * 100).toFixed(1);
    rankHTML += `
      <div class="ranking-item">
        <div class="rank-badge ${badgeClass}">${medal}</div>
        <span class="rank-name">${item.alternative}</span>
        <div class="rank-bar-wrap"><div class="rank-bar" style="width:${pct}%"></div></div>
        <span class="rank-score">${(item.score * 100).toFixed(2)}%</span>
      </div>`;
  });
  rankHTML += '</div>';

  content.innerHTML = `
    <div class="result-consistent">
      <h3>✅ Matrice cohérente</h3>
      <div class="stats">
        <div class="stat-box"><span>λmax</span><strong>${data.lambda_max}</strong></div>
        <div class="stat-box"><span>CI</span><strong>${data.CI}</strong></div>
        <div class="stat-box"><span>RI</span><strong>${data.RI}</strong></div>
        <div class="stat-box"><span>CR</span><strong style="color:#276749">${data.CR}</strong></div>
      </div>
      <h3 style="margin-top:20px">Poids des critères</h3>
      ${weightsHTML}
      <h3 style="margin-top:20px">Classement des alternatives</h3>
      ${rankHTML}
      <p style="margin-top:15px;font-weight:600;color:#276749;font-size:1.05rem">
        🏆 Meilleure alternative : ${data.best}
      </p>
    </div>`;

  section.scrollIntoView({ behavior: "smooth" });
}