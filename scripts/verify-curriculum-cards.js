/**
 * Script de Verificación Automática - Cards del Currículo
 * 
 * Ejecutar en la consola del navegador (F12) cuando la página del currículo esté cargada.
 * 
 * Este script verifica automáticamente todos los criterios de aceptación.
 */

(function verifyCurriculumCards() {
  console.log('🔍 Iniciando verificación de Cards del Currículo...\n');

  const results = {
    aspectRatio: { pass: false, details: [] },
    gridLayout: { pass: false, details: [] },
    minMaxHeight: { pass: false, details: [] },
    scrollInternal: { pass: false, details: [] },
    keyboardNav: { pass: false, details: [] },
    overscroll: { pass: false, details: [] },
    functionality: { pass: false, details: [] }
  };

  // 1. Verificar Aspect Ratio 16:10
  console.log('1️⃣ Verificando Aspect Ratio 16:10...');
  const cards = document.querySelectorAll('[class*="card"]');
  if (cards.length === 0) {
    console.error('❌ No se encontraron cards. Asegúrate de estar en la página correcta.');
    return;
  }

  let aspectRatioPass = true;
  cards.forEach((card, i) => {
    const rect = card.getBoundingClientRect();
    const computedStyles = window.getComputedStyle(card);
    const aspectRatio = rect.width / rect.height;
    const expectedRatio = 16 / 10;
    const tolerance = 0.1; // 10% de tolerancia

    if (Math.abs(aspectRatio - expectedRatio) > tolerance) {
      aspectRatioPass = false;
      results.aspectRatio.details.push(
        `Card ${i + 1}: Ratio ${aspectRatio.toFixed(2)} (esperado: ${expectedRatio.toFixed(2)})`
      );
    }

    // Verificar que aspect-ratio CSS esté aplicado
    if (computedStyles.aspectRatio !== '16 / 10' && computedStyles.aspectRatio !== '1.6') {
      results.aspectRatio.details.push(`Card ${i + 1}: aspect-ratio CSS no aplicado`);
      aspectRatioPass = false;
    }
  });

  results.aspectRatio.pass = aspectRatioPass;
  console.log(aspectRatioPass ? '✅ Aspect Ratio: PASS' : '❌ Aspect Ratio: FAIL');
  if (!aspectRatioPass) {
    console.log('Detalles:', results.aspectRatio.details);
  }

  // 2. Verificar CSS Grid
  console.log('\n2️⃣ Verificando CSS Grid...');
  const grid = document.querySelector('[class*="grid"]');
  if (!grid) {
    console.error('❌ No se encontró el contenedor grid.');
    results.gridLayout.pass = false;
  } else {
    const gridStyles = window.getComputedStyle(grid);
    const hasGrid = gridStyles.display === 'grid';
    const hasAutoFill = gridStyles.gridTemplateColumns.includes('repeat') && 
                        gridStyles.gridTemplateColumns.includes('minmax(320px');
    
    results.gridLayout.pass = hasGrid && hasAutoFill;
    results.gridLayout.details.push(`Display: ${gridStyles.display}`);
    results.gridLayout.details.push(`Grid-template-columns: ${gridStyles.gridTemplateColumns}`);
    console.log(results.gridLayout.pass ? '✅ CSS Grid: PASS' : '❌ CSS Grid: FAIL');
    if (!results.gridLayout.pass) {
      console.log('Detalles:', results.gridLayout.details);
    }
  }

  // 3. Verificar Min/Max Height
  console.log('\n3️⃣ Verificando Min/Max Height (420px - 480px)...');
  let heightPass = true;
  cards.forEach((card, i) => {
    const rect = card.getBoundingClientRect();
    const computedStyles = window.getComputedStyle(card);
    const minHeight = parseFloat(computedStyles.minHeight);
    const maxHeight = parseFloat(computedStyles.maxHeight);
    const currentHeight = rect.height;

    if (minHeight < 420 || minHeight > 425) {
      heightPass = false;
      results.minMaxHeight.details.push(`Card ${i + 1}: min-height ${minHeight}px (esperado: 420px)`);
    }

    if (maxHeight < 475 || maxHeight > 485) {
      heightPass = false;
      results.minMaxHeight.details.push(`Card ${i + 1}: max-height ${maxHeight}px (esperado: 480px)`);
    }

    if (currentHeight < 420 || currentHeight > 480) {
      heightPass = false;
      results.minMaxHeight.details.push(`Card ${i + 1}: altura actual ${currentHeight.toFixed(0)}px fuera de rango`);
    }
  });

  results.minMaxHeight.pass = heightPass;
  console.log(heightPass ? '✅ Min/Max Height: PASS' : '❌ Min/Max Height: FAIL');
  if (!heightPass) {
    console.log('Detalles:', results.minMaxHeight.details);
  }

  // 4. Verificar Scroll Interno
  console.log('\n4️⃣ Verificando Scroll Interno...');
  const cardBodies = document.querySelectorAll('[class*="cardBody"]');
  let scrollPass = true;

  if (cardBodies.length === 0) {
    scrollPass = false;
    results.scrollInternal.details.push('No se encontraron elementos cardBody');
  } else {
    cardBodies.forEach((body, i) => {
      const computedStyles = window.getComputedStyle(body);
      const hasOverflowY = computedStyles.overflowY === 'auto' || computedStyles.overflowY === 'scroll';
      const hasMinHeightZero = computedStyles.minHeight === '0px';
      const hasFlex = computedStyles.flex !== 'none';

      if (!hasOverflowY) {
        scrollPass = false;
        results.scrollInternal.details.push(`CardBody ${i + 1}: overflow-y no es auto (${computedStyles.overflowY})`);
      }

      if (!hasMinHeightZero) {
        scrollPass = false;
        results.scrollInternal.details.push(`CardBody ${i + 1}: min-height no es 0 (${computedStyles.minHeight})`);
      }

      // Verificar que header y footer no tengan overflow
      const card = body.closest('[class*="card"]');
      if (card) {
        const header = card.querySelector('[class*="cardHeader"]');
        const footer = card.querySelector('[class*="cardFooter"]');
        
        if (header) {
          const headerStyles = window.getComputedStyle(header);
          if (headerStyles.overflow !== 'visible') {
            results.scrollInternal.details.push(`Card ${i + 1}: header tiene overflow (${headerStyles.overflow})`);
          }
        }

        if (footer) {
          const footerStyles = window.getComputedStyle(footer);
          if (footerStyles.overflow !== 'visible') {
            results.scrollInternal.details.push(`Card ${i + 1}: footer tiene overflow (${footerStyles.overflow})`);
          }
        }
      }
    });
  }

  results.scrollInternal.pass = scrollPass;
  console.log(scrollPass ? '✅ Scroll Interno: PASS' : '❌ Scroll Interno: FAIL');
  if (!scrollPass) {
    console.log('Detalles:', results.scrollInternal.details);
  }

  // 5. Verificar Navegación por Teclado
  console.log('\n5️⃣ Verificando Navegación por Teclado...');
  let keyboardPass = true;

  cardBodies.forEach((body, i) => {
    const hasTabIndex = body.tabIndex === 0;
    if (!hasTabIndex) {
      keyboardPass = false;
      results.keyboardNav.details.push(`CardBody ${i + 1}: tabIndex no es 0 (${body.tabIndex})`);
    }
  });

  results.keyboardNav.pass = keyboardPass;
  console.log(keyboardPass ? '✅ Navegación por Teclado: PASS' : '❌ Navegación por Teclado: FAIL');
  if (!keyboardPass) {
    console.log('Detalles:', results.keyboardNav.details);
  }

  // 6. Verificar Overscroll Behavior
  console.log('\n6️⃣ Verificando Overscroll Behavior...');
  let overscrollPass = true;

  cardBodies.forEach((body, i) => {
    const computedStyles = window.getComputedStyle(body);
    const hasOverscrollContain = computedStyles.overscrollBehavior === 'contain' || 
                                  computedStyles.overscrollBehaviorY === 'contain';
    
    if (!hasOverscrollContain) {
      overscrollPass = false;
      results.overscroll.details.push(
        `CardBody ${i + 1}: overscroll-behavior no es contain (${computedStyles.overscrollBehavior})`
      );
    }
  });

  results.overscroll.pass = overscrollPass;
  console.log(overscrollPass ? '✅ Overscroll Behavior: PASS' : '❌ Overscroll Behavior: FAIL');
  if (!overscrollPass) {
    console.log('Detalles:', results.overscroll.details);
  }

  // 7. Verificar Funcionalidad (básica)
  console.log('\n7️⃣ Verificando Funcionalidad Básica...');
  let functionalityPass = true;

  // Verificar que las cards tengan handlers de click
  cards.forEach((card, i) => {
    const hasClickHandler = card.onclick !== null;
    // Verificar que haya botones de acción
    const hasFooter = card.querySelector('[class*="cardFooter"]') !== null;
    
    if (!hasFooter) {
      functionalityPass = false;
      results.functionality.details.push(`Card ${i + 1}: no tiene footer con acciones`);
    }
  });

  results.functionality.pass = functionalityPass;
  console.log(functionalityPass ? '✅ Funcionalidad: PASS' : '⚠️ Funcionalidad: WARNING (verificación manual requerida)');
  if (!functionalityPass) {
    console.log('Detalles:', results.functionality.details);
  }

  // Resumen Final
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN DE VERIFICACIÓN');
  console.log('='.repeat(50));
  
  const allPass = Object.values(results).every(r => r.pass);
  const passedCount = Object.values(results).filter(r => r.pass).length;
  const totalCount = Object.keys(results).length;

  console.log(`\n✅ Criterios pasados: ${passedCount}/${totalCount}`);
  console.log(`\n${allPass ? '🎉 TODOS LOS CRITERIOS CUMPLIDOS' : '⚠️ ALGUNOS CRITERIOS FALLARON'}\n`);

  Object.entries(results).forEach(([key, result]) => {
    const icon = result.pass ? '✅' : '❌';
    const name = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
    console.log(`${icon} ${name}`);
  });

  console.log('\n💡 Tip: Usa el checklist manual (QA_CURRICULUM_CARDS_CHECKLIST.md) para verificación completa');
  
  return results;
})();

