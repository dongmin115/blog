// 글의 날짜(월+일)로 정하는 계절 색. 반딧불 숲의 반딧불과 우주의 행성/별이 같이 써요.
// [월(1.0=1월 1일), 색조, 채도, 밝기]. 마지막 줄은 첫 줄과 같아서 한 해가 이어지고, 색조는 가까운 쪽으로 돌아가며 섞여요.
// 봄 연분홍 → 초록 → 가을 호박색 → 겨울 푸른 흰빛 → 다시 봄.
const STOPS = [[1, 210, 40, 72], [2, 200, 44, 70], [3, 10, 55, 66], [4, 70, 45, 60], [5.5, 120, 40, 50], [8, 150, 34, 38], [9.5, 55, 48, 50], [10.5, 28, 62, 52], [11.3, 10, 62, 48], [12, 340, 40, 62], [13, 210, 40, 72]];

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** @param mf 월 + (일-1)/30 예: 9월 13일 → 9.4 */
export function seasonHsl(mf: number): [number, number, number] {
  mf = clamp(mf, 1, 12.999);
  for (let i = 1; i < STOPS.length; i++) {
    if (mf <= STOPS[i][0]) {
      const a = STOPS[i - 1], b = STOPS[i], k = (mf - a[0]) / (b[0] - a[0]);
      let dh = b[1] - a[1]; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
      return [(a[1] + dh * k + 360) % 360, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k];
    }
  }
  return [210, 40, 72];
}
