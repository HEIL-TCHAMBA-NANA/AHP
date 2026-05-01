from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .ahp import run_ahp

@api_view(['POST'])
def compute_ahp(request):
    data = request.data

    criteria         = data.get('criteria')
    alternatives     = data.get('alternatives')
    criteria_matrix  = data.get('criteria_matrix')
    scores           = data.get('scores')
    lower_is_better  = data.get('lower_is_better', [])

    if not all([criteria, alternatives, criteria_matrix, scores]):
        return Response(
            {"error": "Champs manquants : criteria, alternatives, criteria_matrix, scores"},
            status=status.HTTP_400_BAD_REQUEST
        )

    n = len(criteria)
    if len(criteria_matrix) != n or any(len(row) != n for row in criteria_matrix):
        return Response(
            {"error": f"criteria_matrix doit être {n}×{n}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    for c in criteria:
        if c not in scores:
            return Response(
                {"error": f"Scores manquants pour le critère : {c}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        for a in alternatives:
            if a not in scores[c]:
                return Response(
                    {"error": f"Score manquant pour {a} sur le critère {c}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

    result = run_ahp(criteria, alternatives, criteria_matrix, scores, lower_is_better)
    return Response(result, status=status.HTTP_200_OK)