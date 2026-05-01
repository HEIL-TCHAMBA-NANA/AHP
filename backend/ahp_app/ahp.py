RI_TABLE = {1: 0, 2: 0, 3: 0.58, 4: 0.9, 5: 1.12,
            6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49}

def normalize_matrix(matrix):
    n = len(matrix)
    col_sums = [sum(matrix[r][c] for r in range(n)) for c in range(n)]
    normalized = [
        [matrix[r][c] / col_sums[c] for c in range(n)]
        for r in range(n)
    ]
    return normalized

def calculate_weights(normalized):
    n = len(normalized)
    return [sum(normalized[r]) / n for r in range(n)]

def calculate_consistency(matrix, weights):
    n = len(matrix)
    weighted_sums = [
        sum(matrix[r][c] * weights[c] for c in range(n))
        for r in range(n)
    ]
    lambdas = [weighted_sums[i] / weights[i] for i in range(n)]
    lambda_max = sum(lambdas) / n
    ci = (lambda_max - n) / (n - 1)
    ri = RI_TABLE.get(n, 1.49)
    cr = ci / ri if ri != 0 else 0
    return {
        "lambda_max": round(lambda_max, 6),
        "CI": round(ci, 6),
        "RI": ri,
        "CR": round(cr, 6),
        "is_consistent": cr < 0.10
    }

def normalize_scores(criteria, alternatives, scores):
    """
    scores = {
      "Price":     {"ASUS": 350000, "LENOVO": 275000, "DELL": 375000},
      "Storage":   {"ASUS": 1000,   "LENOVO": 500,    "DELL": 1000},
      ...
    }
    Pour les critères où plus petit = meilleur (ex: Price),
    on inverse avant de normaliser.
    lower_is_better = liste des critères où plus petit est meilleur
    """
    alt_weights_per_criteria = []

    for c in criteria:
        vals = [scores[c][a] for a in alternatives]
        total = sum(vals)
        weights = [v / total for v in vals]
        alt_weights_per_criteria.append(weights)

    return alt_weights_per_criteria

def synthesize(alternatives, criteria_weights, alt_weights_per_criteria):
    n_alt = len(alternatives)
    totals = [0.0] * n_alt
    for c_idx, cw in enumerate(criteria_weights):
        for a_idx in range(n_alt):
            totals[a_idx] += cw * alt_weights_per_criteria[c_idx][a_idx]
    results = [
        {"alternative": alternatives[i], "score": round(totals[i], 6)}
        for i in range(n_alt)
    ]
    results.sort(key=lambda x: x["score"], reverse=True)
    return results

def run_ahp(criteria, alternatives, criteria_matrix, scores, lower_is_better):
    # 1. Normaliser matrice critères
    norm = normalize_matrix(criteria_matrix)
    criteria_weights = calculate_weights(norm)

    # 2. Vérifier cohérence
    consistency = calculate_consistency(criteria_matrix, criteria_weights)

    if not consistency["is_consistent"]:
        return {
            "consistent": False,
            "CR": consistency["CR"],
            "CI": consistency["CI"],
            "RI": consistency["RI"],
            "lambda_max": consistency["lambda_max"],
            "reason": f"CR = {consistency['CR']:.4f} ≥ 0.10. Veuillez réviser vos comparaisons."
        }

    # 3. Normaliser scores alternatives
    # Pour critères lower_is_better, on inverse les scores
    adjusted_scores = {}
    for c in criteria:
        adjusted_scores[c] = {}
        for a in alternatives:
            val = scores[c][a]
            if c in lower_is_better and val != 0:
                adjusted_scores[c][a] = 1 / val
            else:
                adjusted_scores[c][a] = val

    alt_weights = normalize_scores(criteria, alternatives, adjusted_scores)

    # 4. Synthèse
    ranking = synthesize(alternatives, criteria_weights, alt_weights)

    return {
        "consistent": True,
        "CR": consistency["CR"],
        "CI": consistency["CI"],
        "RI": consistency["RI"],
        "lambda_max": consistency["lambda_max"],
        "criteria_weights": dict(zip(criteria, [round(w, 6) for w in criteria_weights])),
        "ranking": ranking,
        "best": ranking[0]["alternative"]
    }