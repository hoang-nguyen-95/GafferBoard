"""Bài toán gán tối ưu (thuật toán Hungarian, O(n^2 m)) không cần thư viện ngoài."""


def solve_assignment(score: list[list[float]]) -> list[int]:
    """`score[i][j]`: điểm khi gán hàng i cho cột j (n hàng <= m cột). Trả về cột được gán cho mỗi hàng,
    tối đa hóa tổng điểm. Mỗi cột dùng tối đa một lần."""
    n = len(score)
    if n == 0:
        return []
    m = len(score[0])
    if n > m:
        raise ValueError("Cần số cột >= số hàng")
    INF = float("inf")
    cost = [[-v for v in row] for row in score]  # tối thiểu hóa -điểm
    u = [0.0] * (n + 1)
    v = [0.0] * (m + 1)
    way = [0] * (m + 1)
    match = [0] * (m + 1)  # match[j] = hàng (1-based) đang gán cho cột j
    for i in range(1, n + 1):
        match[0] = i
        j0 = 0
        minv = [INF] * (m + 1)
        used = [False] * (m + 1)
        while True:
            used[j0] = True
            i0, delta, j1 = match[j0], INF, 0
            for j in range(1, m + 1):
                if not used[j]:
                    cur = cost[i0 - 1][j - 1] - u[i0] - v[j]
                    if cur < minv[j]:
                        minv[j], way[j] = cur, j0
                    if minv[j] < delta:
                        delta, j1 = minv[j], j
            for j in range(m + 1):
                if used[j]:
                    u[match[j]] += delta
                    v[j] -= delta
                else:
                    minv[j] -= delta
            j0 = j1
            if match[j0] == 0:
                break
        while j0:
            j1 = way[j0]
            match[j0] = match[j1]
            j0 = j1
    result = [0] * n
    for j in range(1, m + 1):
        if match[j]:
            result[match[j] - 1] = j - 1
    return result
