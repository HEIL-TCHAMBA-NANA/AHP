---

## Prerequisites

- Python 3.8+
- pip

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

### 2. Create and activate virtual environment

```bash
python -m venv venv

# Linux / macOS
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the backend server

```bash
cd backend
python manage.py migrate
python manage.py runserver
```

The API will be available at `http://127.0.0.1:8000/api/ahp/compute/`

### 5. Open the frontend

Open `frontend/index.html` directly in your browser (no server needed).

---

## How to Use

### Step 1 — Define Criteria & Alternatives

- Enter your **criteria** separated by commas  
  Example: `Price, Storage, Processor, RAM`
- Enter your **alternatives** separated by commas  
  Example: `ASUS, LENOVO, DELL`
- Click **Suivant**

### Step 2 — Enter Scores

- For each criterion, enter the **real value** of each alternative  
  Example: Price of ASUS = `350000`, Storage of DELL = `1000`
- Check **"Plus petit = meilleur"** for criteria where a lower value is better  
  Example: Price (cheaper is better)
- Click **Suivant**

### Step 3 — Fill the Pairwise Comparison Matrix

- Compare each criterion against the others using Saaty's scale:

| Value | Meaning |
|-------|---------|
| 1 | Equal importance |
| 3 | Moderate importance |
| 5 | Strong importance |
| 7 | Very strong importance |
| 9 | Extreme importance |
| 1/3, 1/5, 1/7, 1/9 | Inverse values |

- The lower triangle is filled **automatically** (inverse values)
- Click **Calculer AHP**

### Step 4 — Results

- If the matrix is **consistent** (CR < 0.10):
  - Criteria weights are displayed
  - Alternatives are ranked by score
  - The best alternative is highlighted

- If the matrix is **inconsistent** (CR ≥ 0.10):
  - CR, CI, and λmax are displayed
  - You are asked to revise your comparisons

---

## API Reference

**POST** `/api/ahp/compute/`

Request body:
```json
{
  "criteria": ["Price", "Storage", "RAM"],
  "alternatives": ["ASUS", "DELL", "LENOVO"],
  "criteria_matrix": [
    [1, 5, 7],
    [0.2, 1, 3],
    [0.143, 0.333, 1]
  ],
  "scores": {
    "Price":   {"ASUS": 350000, "DELL": 375000, "LENOVO": 275000},
    "Storage": {"ASUS": 1000,   "DELL": 1000,   "LENOVO": 500},
    "RAM":     {"ASUS": 16,     "DELL": 8,       "LENOVO": 16}
  },
  "lower_is_better": ["Price"]
}
```

Response (consistent):
```json
{
  "consistent": true,
  "CR": 0.052,
  "CI": 0.046,
  "RI": 0.58,
  "lambda_max": 3.092,
  "criteria_weights": {"Price": 0.731, "Storage": 0.188, "RAM": 0.081},
  "ranking": [
    {"alternative": "LENOVO", "score": 0.45},
    {"alternative": "ASUS",   "score": 0.33},
    {"alternative": "DELL",   "score": 0.22}
  ],
  "best": "LENOVO"
}
```

Response (inconsistent):
```json
{
  "consistent": false,
  "CR": 0.152,
  "CI": 0.137,
  "RI": 0.9,
  "lambda_max": 4.411,
  "reason": "CR = 0.1520 ≥ 0.10. Veuillez réviser vos comparaisons."
}
```

---

## References

- Saaty, T.L. (1980). *The Analytic Hierarchy Process*. McGraw-Hill.
- INF4178 Software Engineering Lecture Notes — AHP, PATRICK FOUOTSOP FOSSO
