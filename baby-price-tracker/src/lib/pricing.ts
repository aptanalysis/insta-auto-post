/**
 * '평소 가격'과 알림 여부를 결정하는 순수 함수들 (DB/네트워크 없음 → 테스트 용이)
 */

export function median(nums: number[]): number | null {
  const a = nums.filter((n) => Number.isFinite(n) && n > 0).sort((x, y) => x - y);
  if (a.length === 0) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2);
}

/**
 * 평소 가격 = 최근 기록(이번 체크 이전)의 중앙값.
 * 기록이 3개 미만이면 등록 당시 가격을 평소 가격으로 사용.
 * 중앙값을 쓰는 이유: 하루짜리 반짝 특가/일시 품절가에 흔들리지 않도록.
 */
export function usualPrice(previousPrices: number[], initialPrice: number): number {
  if (previousPrices.length < 3) return initialPrice;
  return median(previousPrices) ?? initialPrice;
}

export type AlertInput = {
  current: number;
  usual: number;
  dropPct: number; // 예: 5 → 평소보다 5% 이상 싸면
  targetPrice: number | null;
  lowestEver: number | null; // 이번 체크 이전까지의 최저가
  lastAlertPrice: number | null; // 마지막으로 알림 보낸 가격 (딜 종료 시 null로 리셋)
};

export type AlertDecision = {
  alert: boolean;
  reasons: string[];
  /** 다음 last_alert_price 값 */
  nextLastAlertPrice: number | null;
  /** 평소 대비 변동률 (%) */
  changePct: number;
};

export function decideAlert(i: AlertInput): AlertDecision {
  const changePct = i.usual > 0 ? ((i.current - i.usual) / i.usual) * 100 : 0;
  const threshold = i.usual * (1 - i.dropPct / 100);

  const reasons: string[] = [];
  if (i.current <= threshold) reasons.push(`평소가 대비 ${Math.abs(changePct).toFixed(1)}% 할인`);
  if (i.targetPrice != null && i.current <= i.targetPrice) reasons.push("목표가 도달");
  if (i.lowestEver != null && i.current < i.lowestEver && reasons.length > 0) reasons.push("역대 최저가");

  const isDeal = reasons.length > 0;
  if (!isDeal) {
    // 가격이 다시 평소 수준으로 돌아가면 딜 종료 → 다음 할인 때 다시 알림
    return { alert: false, reasons: [], nextLastAlertPrice: null, changePct };
  }
  // 같은 할인에 대해 반복 알림 방지: 이전 알림가보다 더 내려갔을 때만 다시 알림
  if (i.lastAlertPrice != null && i.current >= i.lastAlertPrice) {
    return { alert: false, reasons, nextLastAlertPrice: i.lastAlertPrice, changePct };
  }
  return { alert: true, reasons, nextLastAlertPrice: i.current, changePct };
}
