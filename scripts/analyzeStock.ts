/**
 * Stock Analysis Script for Loscam Red - KPP & PLK
 * Run this in browser console or as a standalone script
 */

interface AnalysisResult {
  branch: string;
  branchName: string;
  palletId: string;
  currentStock: number;
  calculatedStock: number;
  totalIn: number;
  totalOut: number;
  pendingIn: number;
  pendingOut: number;
  transactions: {
    date: string;
    docNo: string;
    type: string;
    status: string;
    source: string;
    dest: string;
    qty: number;
    effect: string;
    runningTotal?: number;
  }[];
  discrepancy: number;
  issues: string[];
}

export function analyzeStockForBranch(
  transactions: any[],
  stock: any,
  branchId: string,
  palletId: string
): AnalysisResult {
  const branchNames: Record<string, string> = {
    kpp: 'สาขากำแพงเพชร',
    plk: 'สาขาพิษณุโลก',
    hub_nw: 'ศูนย์ฯ NW (Hub)',
    sai3: 'สาขาพุทธมณฑลสาย 3',
    cm: 'สาขาเชียงใหม่',
    ekp: 'EKP',
    ms: 'สาขาแม่สอด',
    maintenance_stock: 'คลังซ่อมบำรุง'
  };

  const currentStock = stock[branchId]?.[palletId] || 0;
  
  // Filter transactions related to this branch and pallet
  const relatedTxs = transactions
    .filter(tx => 
      tx.palletId === palletId && 
      (tx.source === branchId || tx.dest === branchId) &&
      tx.status !== 'CANCELLED'
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let totalIn = 0;
  let totalOut = 0;
  let pendingIn = 0;
  let pendingOut = 0;
  let runningTotal = 0;
  const issues: string[] = [];

  const txDetails = relatedTxs.map(tx => {
    let effect = '';
    let qtyChange = 0;

    if (tx.dest === branchId) {
      // Incoming to this branch
      if (tx.status === 'COMPLETED') {
        totalIn += tx.qty;
        qtyChange = tx.qty;
        effect = `+${tx.qty} (รับเข้า COMPLETED)`;
      } else if (tx.status === 'PENDING') {
        pendingIn += tx.qty;
        effect = `(+${tx.qty} รอยืนยัน)`;
      }
    }

    if (tx.source === branchId) {
      // Outgoing from this branch
      totalOut += tx.qty;
      qtyChange = -tx.qty;
      if (tx.status === 'COMPLETED') {
        effect = `-${tx.qty} (จ่ายออก COMPLETED)`;
      } else if (tx.status === 'PENDING') {
        pendingOut += tx.qty;
        effect = `-${tx.qty} (จ่ายออก PENDING - หักแล้ว)`;
      }
    }

    runningTotal += qtyChange;

    return {
      date: new Date(tx.date).toLocaleDateString('th-TH'),
      docNo: tx.docNo || '-',
      type: tx.type,
      status: tx.status,
      source: branchNames[tx.source] || tx.source,
      dest: branchNames[tx.dest] || tx.dest,
      qty: tx.qty,
      effect,
      runningTotal
    };
  });

  // Calculate expected stock
  const calculatedStock = totalIn - totalOut;

  // Check for discrepancy
  const discrepancy = currentStock - calculatedStock;

  if (discrepancy !== 0) {
    issues.push(`⚠️ ยอดไม่ตรง: สต็อกปัจจุบัน (${currentStock}) ≠ ยอดคำนวณ (${calculatedStock}), ต่างกัน ${discrepancy}`);
  }

  // Check for negative stock
  if (currentStock < 0) {
    issues.push(`🔴 สต็อกติดลบ: ${currentStock} ตัว`);
  }

  // Check for pending transactions
  if (pendingIn > 0) {
    issues.push(`📦 มีรายการรอรับ: ${pendingIn} ตัว`);
  }

  return {
    branch: branchId,
    branchName: branchNames[branchId] || branchId,
    palletId,
    currentStock,
    calculatedStock,
    totalIn,
    totalOut,
    pendingIn,
    pendingOut,
    transactions: txDetails,
    discrepancy,
    issues
  };
}

// Function to print analysis to console
export function printAnalysis(result: AnalysisResult) {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 STOCK ANALYSIS: ${result.branchName} - ${result.palletId.toUpperCase()}`);
  console.log('='.repeat(80));
  
  console.log('\n📈 SUMMARY:');
  console.log(`   สต็อกปัจจุบัน (Firebase): ${result.currentStock} ตัว`);
  console.log(`   ยอดคำนวณจาก Transactions: ${result.calculatedStock} ตัว`);
  console.log(`   ส่วนต่าง: ${result.discrepancy} ตัว`);
  console.log(`   รวมรับเข้า (COMPLETED): ${result.totalIn} ตัว`);
  console.log(`   รวมจ่ายออก: ${result.totalOut} ตัว`);
  console.log(`   รอรับ (PENDING): ${result.pendingIn} ตัว`);
  
  if (result.issues.length > 0) {
    console.log('\n⚠️ ISSUES:');
    result.issues.forEach(issue => console.log(`   ${issue}`));
  }

  console.log('\n📋 TRANSACTION HISTORY:');
  console.table(result.transactions);
}

// Export for use in browser console
(window as any).analyzeStock = {
  analyzeStockForBranch,
  printAnalysis,
  runAnalysis: (transactions: any[], stock: any) => {
    const kppResult = analyzeStockForBranch(transactions, stock, 'kpp', 'loscam_red');
    const plkResult = analyzeStockForBranch(transactions, stock, 'plk', 'loscam_red');
    
    printAnalysis(kppResult);
    printAnalysis(plkResult);
    
    return { kpp: kppResult, plk: plkResult };
  }
};

console.log('📊 Stock Analysis loaded. Use: analyzeStock.runAnalysis(transactions, stock)');
