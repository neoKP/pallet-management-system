/**
 * Debug Script for PLK Stock Analysis
 * 
 * วิธีใช้:
 * 1. เปิด Browser ไปที่ http://localhost:3000
 * 2. Login เป็น Admin
 * 3. เปิด Developer Console (F12)
 * 4. Copy code ด้านล่างนี้ไปวางใน Console แล้วกด Enter
 */

// ============================================
// COPY CODE BELOW TO BROWSER CONSOLE
// ============================================

(function debugPLKStock() {
  // Get React Fiber to access state
  const getReactState = () => {
    const root = document.getElementById('root');
    if (!root || !root._reactRootContainer) {
      console.error('❌ ไม่พบ React root - กรุณาเปิดหน้าเว็บก่อน');
      return null;
    }
    
    // Try to find StockContext data
    const fiber = root._reactRootContainer._internalRoot?.current;
    if (!fiber) {
      console.error('❌ ไม่พบ React Fiber');
      return null;
    }
    
    return fiber;
  };

  // Alternative: Get data from Firebase directly
  const getFirebaseData = async () => {
    if (!window.firebase) {
      console.error('❌ Firebase ยังไม่ได้ initialize');
      return null;
    }
    
    const db = window.firebase.database();
    const { ref, get } = window.firebase.utils;
    
    try {
      const stockSnap = await get(ref(db, 'stock'));
      const txSnap = await get(ref(db, 'transactions'));
      
      return {
        stock: stockSnap.val(),
        transactions: txSnap.val() ? (Array.isArray(txSnap.val()) ? txSnap.val() : Object.values(txSnap.val())) : []
      };
    } catch (err) {
      console.error('❌ Error fetching Firebase data:', err);
      return null;
    }
  };

  // Main analysis function
  const analyzePLK = async () => {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 DEBUG: PLK Stock Analysis - Loscam Red & Yellow');
    console.log('='.repeat(80));
    
    const data = await getFirebaseData();
    if (!data) return;
    
    const { stock, transactions } = data;
    const branchId = 'plk';
    const pallets = ['loscam_red', 'loscam_yellow'];
    
    console.log('\n📊 CURRENT STOCK (from Firebase):');
    console.log(`   PLK Stock Object:`, stock?.plk);
    
    pallets.forEach(palletId => {
      console.log('\n' + '-'.repeat(60));
      console.log(`📦 ${palletId.toUpperCase()}:`);
      console.log(`   Current Stock: ${stock?.plk?.[palletId] ?? 'undefined'}`);
      
      // Filter transactions for PLK and this pallet
      const relatedTxs = transactions.filter(tx => 
        tx && tx.palletId === palletId && 
        (tx.source === branchId || tx.dest === branchId)
      );
      
      console.log(`   Total Transactions: ${relatedTxs.length}`);
      
      if (relatedTxs.length === 0) {
        console.log('   ⚠️ ไม่พบ Transaction ใดๆ สำหรับพาเลทนี้ที่ PLK');
        console.log('   💡 สาเหตุ: ยังไม่เคยมีการรับเข้าหรือจ่ายออกพาเลทนี้ที่สาขา PLK');
        return;
      }
      
      // Group by status
      const byStatus = {
        COMPLETED: relatedTxs.filter(t => t.status === 'COMPLETED'),
        PENDING: relatedTxs.filter(t => t.status === 'PENDING'),
        CANCELLED: relatedTxs.filter(t => t.status === 'CANCELLED')
      };
      
      console.log(`   - COMPLETED: ${byStatus.COMPLETED.length}`);
      console.log(`   - PENDING: ${byStatus.PENDING.length}`);
      console.log(`   - CANCELLED: ${byStatus.CANCELLED.length}`);
      
      // Calculate expected stock
      let inQty = 0, outQty = 0, pendingInQty = 0;
      
      relatedTxs.forEach(tx => {
        if (tx.status === 'CANCELLED') return;
        
        // Incoming to PLK
        if (tx.dest === branchId) {
          if (tx.status === 'COMPLETED') {
            inQty += tx.qty;
          } else if (tx.status === 'PENDING') {
            pendingInQty += tx.qty;
          }
        }
        
        // Outgoing from PLK (always deducted regardless of status)
        if (tx.source === branchId) {
          outQty += tx.qty;
        }
      });
      
      const expectedStock = inQty - outQty;
      const currentStock = stock?.plk?.[palletId] ?? 0;
      const discrepancy = currentStock - expectedStock;
      
      console.log('\n   📈 CALCULATION:');
      console.log(`   รับเข้า (COMPLETED): +${inQty}`);
      console.log(`   รอรับ (PENDING): +${pendingInQty} (ยังไม่นับ)`);
      console.log(`   จ่ายออก: -${outQty}`);
      console.log(`   ─────────────────────`);
      console.log(`   ยอดที่ควรจะเป็น: ${expectedStock}`);
      console.log(`   ยอดปัจจุบัน: ${currentStock}`);
      
      if (discrepancy !== 0) {
        console.log(`   ⚠️ ส่วนต่าง: ${discrepancy}`);
        if (discrepancy > 0) {
          console.log('   💡 สต็อกมากกว่าที่คำนวณ - อาจมีการ ADJUST เพิ่ม');
        } else {
          console.log('   💡 สต็อกน้อยกว่าที่คำนวณ - อาจมีการ ADJUST ลด หรือ Reset');
        }
      } else {
        console.log('   ✅ ยอดถูกต้อง!');
      }
      
      // Show PENDING transactions
      if (byStatus.PENDING.length > 0) {
        console.log('\n   📋 รายการ PENDING (รอยืนยันรับ):');
        byStatus.PENDING.forEach(tx => {
          console.log(`      - ${tx.docNo}: ${tx.qty} ตัว จาก ${tx.source} (${new Date(tx.date).toLocaleDateString('th-TH')})`);
        });
      }
      
      // Show all transactions
      console.log('\n   📋 รายการทั้งหมด:');
      console.table(relatedTxs.map(tx => ({
        date: new Date(tx.date).toLocaleDateString('th-TH'),
        docNo: tx.docNo || '-',
        type: tx.type,
        status: tx.status,
        source: tx.source,
        dest: tx.dest,
        qty: tx.qty
      })));
    });
    
    // Check for ADJUST transactions
    const adjustTxs = transactions.filter(tx => 
      tx && tx.type === 'ADJUST' && 
      (tx.source === branchId || tx.dest === branchId)
    );
    
    if (adjustTxs.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('⚠️ พบรายการ ADJUST (ปรับยอดโดย Admin):');
      console.table(adjustTxs.map(tx => ({
        date: new Date(tx.date).toLocaleDateString('th-TH'),
        docNo: tx.docNo,
        palletId: tx.palletId,
        qty: tx.qty,
        note: tx.note,
        previousQty: tx.previousQty,
        adjustedBy: tx.adjustedBy
      })));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📌 สรุป: หากยอดเป็น 0 และไม่มี Transaction ใดๆ');
    console.log('   → แสดงว่ายังไม่เคยมีการรับพาเลทเข้าสาขา PLK');
    console.log('   → หรือมีการ Reset ยอดเป็น 0 โดย Admin');
    console.log('='.repeat(80));
  };
  
  // Run analysis
  analyzePLK();
})();
