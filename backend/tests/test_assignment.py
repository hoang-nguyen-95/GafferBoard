import itertools
import random

import pytest

from app.services.assignment import solve_assignment


def brute_force_best(score):
    n, m = len(score), len(score[0])
    return max(sum(score[i][cols[i]] for i in range(n)) for cols in itertools.permutations(range(m), n))


@pytest.mark.parametrize("seed", range(40))
def test_matches_brute_force_on_random_matrices(seed):
    rng = random.Random(seed)
    n = rng.randint(1, 4)
    m = rng.randint(n, 6)
    score = [[rng.randint(-20, 99) for _ in range(m)] for _ in range(n)]
    cols = solve_assignment(score)
    assert len(set(cols)) == n  # không trùng cột
    assert sum(score[i][c] for i, c in enumerate(cols)) == brute_force_best(score)


def test_empty_and_too_few_columns():
    assert solve_assignment([]) == []
    with pytest.raises(ValueError):
        solve_assignment([[1], [2]])
