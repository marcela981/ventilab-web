// Datos simulados para el simulador de paciente
// Incluye información completa para todos los pasos del formulario

export const simulatedPatientData = {
  // Datos básicos del paciente
  patientBasicData: {
    // Datos básicos obligatorios
    nombre: 'María José',
    apellido: 'García',
    tipoDocumento: 'Cédula de Ciudadanía',
    documento: '1234567890',
    fechaNacimiento: '1985-03-15',
    edad: 38,
    sexo: 'femenino',
    
    // Datos básicos no obligatorios
    segundoNombre: 'Elena',
    segundoApellido: 'Rodríguez',
    direccion: 'Calle 123 #45-67, Barrio Los Álamos',
    telefonoResidencia: '555-1234',
    contactoEmergenciaNombre: 'Carlos García (Esposo)',
    contactoEmergenciaTelefono: '555-9876',
    
    // Datos antropomórficos obligatorios
    pesoActual: '68.5',
    estatura: '165',
    pesoCorporalIdeal: '59.8', // Se calculará automáticamente
    imc: '25.2', // Se calculará automáticamente
  },

  // Historia clínica y condiciones
  clinicalData: {
    // Signos vitales
    frecuenciaCardiaca: '110',
    frecuenciaRespiratoria: '28',
    tensionArterialSistolica: '140',
    tensionArterialDiastolica: '85',
    saturacionOxigeno: '88',
    temperatura: '38.2',
    
    // Examen físico
    inspeccionGeneral: 'Paciente femenina de 38 años, en decúbito supino, consciente, orientada, con dificultad respiratoria evidente, uso de músculos accesorios, cianosis peribucal discreta, palidez cutánea. Se observa ansiosa y con fatiga.',
    palpacionTorax: 'Expansión torácica disminuida bilateralmente, más marcada en bases. Frémito vocal aumentado en ambas bases pulmonares. No se palpan adenopatías.',
    percusionTorax: 'Matidez en bases pulmonares bilaterales hasta T8-T9. Resonancia normal en vértices pulmonares.',
    auscultacionPulmonar: 'Disminución marcada del murmullo vesicular en bases bilaterales. Crepitantes finos y gruesos en ambas bases. Sibilancias espiratorias difusas. No ruidos sobreagregados en vértices.',
    auscultacionCardiaca: 'Ruidos cardíacos rítmicos, taquicárdicos, sin soplos audibles. No galope. Pulsos periféricos presentes pero débiles.',
    escalaGlasgow: '14',
    
    // Otros datos clínicos
    diagnostico: '',
    alergias: [],
    medicamentos: [],
  },

  // Condiciones respiratorias
  respiratoryConditions: {
    asma: false,
    epoc: false,
    neumonia: true,
    covid19: true,
    ards: false,
  },

  // Estudios diagnósticos
  diagnosticStudies: {
    // Imágenes Diagnósticas
    radiografiaTorax: 'Radiografía de tórax AP: Opacidades alveolares bilaterales de predominio en bases pulmonares con broncograma aéreo. Silueta cardíaca dentro de límites normales. Diafragmas conservados. No evidencia de neumotórax ni derrame pleural significativo.',
    radiografiaFile: null,
    
    ecografiaPulmonar: 'Ecografía pulmonar FAST: Múltiples líneas B bilaterales confluentes en zonas posteriores y laterales. Consolidaciones subpleurales en bases bilaterales con broncograma aéreo dinámico. Patrón compatible con síndrome alveolointersticial.',
    ecografiaFile: null,
    
    tacTorax: 'TAC de tórax con contraste: Opacidades en vidrio esmerilado bilaterales con distribución periférica y en parches. Consolidaciones focales en lóbulos inferiores bilaterales. Engrosamiento septal liso. Patrón compatible con neumonía viral (COVID-19) con sobreinfección bacteriana.',
    tacFile: null,
    
    // Análisis de Laboratorio
    gasesArteriales: 'pH: 7.32, PaO2: 55 mmHg, PaCO2: 48 mmHg, HCO3-: 18 mEq/L, BE: -4, SaO2: 88%, FiO2: 50%, PaO2/FiO2: 110 (ARDS moderado), Lactato: 2.8 mmol/L',
    
    hemogramaCompleto: 'Hb: 11.2 g/dL, Hto: 33%, Leucocitos: 15,400/µL (Neutrófilos: 88%, Linfocitos: 8%, Monocitos: 4%), Plaquetas: 180,000/µL, VSG: 85 mm/h, PCR: 28 mg/dL',
    
    electrolitosFuncionRenal: 'Na+: 135 mEq/L, K+: 3.8 mEq/L, Cl-: 98 mEq/L, Creatinina: 1.3 mg/dL, BUN: 25 mg/dL, Glucosa: 180 mg/dL, Urea: 45 mg/dL',
    
    pruebasCoagulacion: 'PT: 15 seg (control: 12), PTT: 38 seg (control: 28), INR: 1.4, Fibrinógeno: 420 mg/dL, Dímero D: 2.1 µg/mL (elevado), Plaquetas funcionales',
    
    // Formulación del Juicio Clínico
    diagnosticoPrincipal: 'Insuficiencia Respiratoria Aguda Hipoxémica (ARDS moderado) secundaria a Neumonía Bilateral por SARS-CoV-2 con probable sobreinfección bacteriana',
    
    diagnosticoSecundario: 'COVID-19 confirmado por RT-PCR, Síndrome de Respuesta Inflamatoria Sistémica (SIRS), Hiperglucemia de estrés, Coagulopatía asociada a COVID-19',
    
    condicionAsociada: 'Obesidad grado I (IMC 25.2), Riesgo de progresión a ARDS severo, Riesgo de eventos tromboembólicos, Estado proinflamatorio sistémico',
    
    planAccionInmediato: '1) Ventilación mecánica invasiva con estrategia de protección pulmonar (Vt: 6 ml/kg PCI, PEEP: 8-12 cmH2O, Pplat <30 cmH2O)\n2) Posición prono por 16 horas diarias si PaO2/FiO2 <150\n3) Sedoanalgesia con propofol y fentanilo, relajación muscular si es necesario\n4) Monitoreo hemodinámico continuo, control de presión arterial\n5) Antibioticoterapia empírica con ceftriaxona + azitromicina\n6) Anticoagulación profiláctica con heparina de bajo peso molecular\n7) Corticoterapia con dexametasona 6 mg/día por 10 días\n8) Control estricto de glucemia con insulina\n9) Soporte nutricional enteral precoz\n10) Aislamiento de contacto y gotitas, EPP completo para personal'
  },

  // Parámetros calculados
  calculatedParams: {
    volumenTidal: 418, // Calculado automáticamente basado en PCI
    peepRecomendado: 10,
    fio2Inicial: 60,
    frecuenciaResp: 16,
  }
};

// Función para obtener los datos simulados
export const getSimulatedPatientData = () => {
  return JSON.parse(JSON.stringify(simulatedPatientData)); // Deep copy para evitar mutaciones
};

// Casos clínicos predefinidos
export const predefinedClinicalCases = {
  case1_neumonia_grave: {
    title: "Caso 1: Neumonía grave con hipoxemia",
    description: "Hombre de 60 años, con antecedentes de hipertensión, acude con dificultad respiratoria progresiva, fiebre, tos y desaturación. Saturación O₂: 84% con oxígeno suplementario. Rx de tórax muestra consolidación bilateral.",
    ventilatorSettings: {
      mode: "VCV",
      tidalVolume: 420, // 6 ml/kg para 70 kg
      respiratoryRate: 20,
      fio2: 100,
      peep: 8,
      ieRatio: "1:2",
      trigger: -2
    },
    patientBasicData: {
      nombre: 'Juan',
      apellido: 'Rodríguez',
      tipoDocumento: 'Cédula de Ciudadanía',
      documento: '1765432109',
      fechaNacimiento: '1963-05-15',
      edad: 60,
      sexo: 'masculino',
      segundoNombre: 'Carlos',
      segundoApellido: 'Martinez',
      direccion: 'Calle 56 #23-45, Barrio Centro',
      telefonoResidencia: '555-2468',
      contactoEmergenciaNombre: 'Elena Rodríguez (Esposa)',
      contactoEmergenciaTelefono: '555-1357',
      pesoActual: '70',
      estatura: '175',
      pesoCorporalIdeal: '68.6',
      imc: '22.9',
    },
    clinicalData: {
      frecuenciaCardiaca: '105',
      frecuenciaRespiratoria: '24',
      tensionArterialSistolica: '150',
      tensionArterialDiastolica: '90',
      saturacionOxigeno: '84',
      temperatura: '39.1',
      inspeccionGeneral: 'Paciente masculino de 60 años, consciente, orientado, con dificultad respiratoria progresiva, cianosis peribucal, palidez cutánea, uso de músculos accesorios. Antecedentes de hipertensión arterial.',
      palpacionTorax: 'Expansión torácica disminuida bilateralmente. Frémito vocal aumentado en ambas bases pulmonares. Ganglios palpables cervicales reactivos.',
      percusionTorax: 'Matidez en bases pulmonares bilaterales más marcada en hemitórax derecho. Resonancia conservada en vértices.',
      auscultacionPulmonar: 'Disminución del murmullo vesicular en bases bilaterales. Crepitantes gruesos y finos en ambas bases. Broncofonía positiva.',
      auscultacionCardiaca: 'Ruidos cardíacos rítmicos, taquicárdicos, sin soplos. Signos de cor pulmonale crónico.',
      escalaGlasgow: '15',
      diagnostico: 'Neumonía grave con hipoxemia',
      alergias: [],
      medicamentos: ['Enalapril 10mg', 'Hidroclorotiazida 25mg'],
    },
    respiratoryConditions: {
      asma: false,
      epoc: false,
      neumonia: true,
      covid19: false,
      ards: false,
    },
    diagnosticStudies: {
      radiografiaTorax: 'Radiografía de tórax PA y lateral: Consolidación bilateral de predominio en lóbulos inferiores con broncograma aéreo. Silueta cardíaca levemente aumentada. Ángulos costofrénicos libres.',
      gasesArteriales: 'pH: 7.45, PaO2: 52 mmHg, PaCO2: 35 mmHg, HCO3-: 24 mEq/L, SaO2: 84%, FiO2: 40%, PaO2/FiO2: 130',
      hemogramaCompleto: 'Hb: 13.5 g/dL, Hto: 40%, Leucocitos: 18,500/µL (Neutrófilos: 85%, Linfocitos: 10%), Plaquetas: 320,000/µL, VSG: 95 mm/h, PCR: 35 mg/dL',
      diagnosticoPrincipal: 'Neumonía grave con insuficiencia respiratoria tipo I (hipoxémica)',
      diagnosticoSecundario: 'Hipertensión arterial controlada',
      condicionAsociada: 'Riesgo de progresión a ARDS',
      planAccionInmediato: 'VCV: Vt 6ml/kg (420ml), FR 20rpm, FiO₂ 100% inicial luego ajustar, PEEP 8-10 cmH₂O, I:E 1:2, Trigger -1 a -2 cmH₂O'
    },
    calculatedParams: {
      volumenTidal: 420,
      peepRecomendado: 8,
      fio2Inicial: 100,
      frecuenciaResp: 20,
    }
  },

  case2_epoc_descompensado: {
    title: "Caso 2: EPOC descompensado",
    description: "Mujer de 68 años, fumadora activa, con antecedentes de EPOC. Presenta disnea severa, hipercapnia (PaCO₂: 75 mmHg), pH 7.25. Uso de músculos accesorios.",
    ventilatorSettings: {
      mode: "VCV",
      tidalVolume: 480, // 6-8 ml/kg para 70 kg
      respiratoryRate: 12,
      fio2: 35,
      peep: 5,
      ieRatio: "1:4",
      trigger: -1
    },
    patientBasicData: {
      nombre: 'Carmen',
      apellido: 'López',
      tipoDocumento: 'Cédula de Ciudadanía',
      documento: '2856741309',
      fechaNacimiento: '1955-08-22',
      edad: 68,
      sexo: 'femenino',
      segundoNombre: 'Isabel',
      segundoApellido: 'Fernández',
      direccion: 'Carrera 78 #34-12, Barrio La Esperanza',
      telefonoResidencia: '555-3691',
      contactoEmergenciaNombre: 'Pedro López (Hijo)',
      contactoEmergenciaTelefono: '555-2580',
      pesoActual: '65',
      estatura: '160',
      pesoCorporalIdeal: '56.2',
      imc: '25.4',
    },
    clinicalData: {
      frecuenciaCardiaca: '95',
      frecuenciaRespiratoria: '28',
      tensionArterialSistolica: '135',
      tensionArterialDiastolica: '85',
      saturacionOxigeno: '88',
      temperatura: '37.5',
      inspeccionGeneral: 'Paciente femenina de 68 años, fumadora activa, con disnea severa, uso de músculos accesorios, posición de trípode, facies de sufrimiento respiratorio. Coloración cianótica peribucal.',
      palpacionTorax: 'Tórax hiperinsuflado, expansión torácica limitada, frémito vocal disminuido difusamente. Uso marcado de músculos accesorios.',
      percusionTorax: 'Hiperresonancia generalizada, diafragmas descendidos, campos pulmonares aumentados de tamaño.',
      auscultacionPulmonar: 'Murmullo vesicular muy disminuido, tiempo espiratorio prolongado, sibilancias espiratorias difusas, roncus en ambos campos.',
      auscultacionCardiaca: 'Ruidos cardíacos rítmicos, taquicárdicos, sin soplos. Signos de cor pulmonale crónico.',
      escalaGlasgow: '14',
      diagnostico: 'EPOC descompensado',
      alergias: [],
      medicamentos: ['Salbutamol inhalado', 'Tiotropio', 'Prednisona'],
    },
    respiratoryConditions: {
      asma: false,
      epoc: true,
      neumonia: false,
      covid19: false,
      ards: false,
    },
    diagnosticStudies: {
      radiografiaTorax: 'Radiografía de tórax PA: Hiperinsuflación pulmonar bilateral, diafragmas aplanados y descendidos, espacios intercostales aumentados, corazón vertical. Patrón de enfisema.',
      gasesArteriales: 'pH: 7.25, PaO2: 58 mmHg, PaCO2: 75 mmHg, HCO3-: 32 mEq/L, BE: +6, SaO2: 88%, FiO2: 35%',
      hemogramaCompleto: 'Hb: 16.8 g/dL, Hto: 50%, Leucocitos: 12,000/µL, Plaquetas: 280,000/µL, Policitemia secundaria',
      diagnosticoPrincipal: 'Exacerbación aguda de EPOC con acidosis respiratoria',
      diagnosticoSecundario: 'Enfisema pulmonar severo, Cor pulmonale crónico',
      condicionAsociada: 'Hipercapnia crónica reagudizada, Policitemia secundaria',
      planAccionInmediato: 'VCV: Vt 6-8ml/kg (480ml), FR 12-14rpm, FiO₂ 30-40% (evitar hiperoxia), PEEP 5 cmH₂O, I:E 1:3 o 1:4, Trigger -1 cmH₂O'
    },
    calculatedParams: {
      volumenTidal: 480,
      peepRecomendado: 5,
      fio2Inicial: 35,
      frecuenciaResp: 12,
    }
  },

  case3_sdra_sepsis: {
    title: "Caso 3: SDRA por sepsis",
    description: "Hombre de 55 años con sepsis secundaria a infección abdominal. Presenta disnea intensa, infiltrados bilaterales en la Rx, PaO₂/FiO₂: 140.",
    ventilatorSettings: {
      mode: "VCV",
      tidalVolume: 420, // 6 ml/kg
      respiratoryRate: 22,
      fio2: 90,
      peep: 11,
      ieRatio: "1:2",
      trigger: -1
    },
    patientBasicData: {
      nombre: 'Roberto',
      apellido: 'Sánchez',
      tipoDocumento: 'Cédula de Ciudadanía',
      documento: '3947852106',
      fechaNacimiento: '1968-12-10',
      edad: 55,
      sexo: 'masculino',
      segundoNombre: 'Antonio',
      segundoApellido: 'Vargas',
      direccion: 'Avenida 15 #67-89, Barrio Norte',
      telefonoResidencia: '555-4815',
      contactoEmergenciaNombre: 'Lucía Sánchez (Esposa)',
      contactoEmergenciaTelefono: '555-7342',
      pesoActual: '72',
      estatura: '173',
      pesoCorporalIdeal: '67.8',
      imc: '24.1',
    },
    clinicalData: {
      frecuenciaCardiaca: '128',
      frecuenciaRespiratoria: '32',
      tensionArterialSistolica: '85',
      tensionArterialDiastolica: '45',
      saturacionOxigeno: '89',
      temperatura: '38.8',
      inspeccionGeneral: 'Paciente masculino de 55 años en estado crítico, con sepsis abdominal, disnea intensa, signos de shock séptico, uso máximo de músculos accesorios, alteración del sensorio.',
      palpacionTorax: 'Expansión torácica severamente limitada, frémito vocal disminuido bilateralmente, piel marmórea, llenado capilar lento.',
      percusionTorax: 'Matidez en bases bilaterales, resonancia disminuida en campos medios.',
      auscultacionPulmonar: 'Crepitantes finos y gruesos bilaterales difusos, murmullo vesicular muy disminuido, broncofonía en bases.',
      auscultacionCardiaca: 'Taquicardia severa, ruidos cardíacos débiles, galope por S3, hipotensión marcada.',
      escalaGlasgow: '12',
      diagnostico: 'SDRA por sepsis',
      alergias: [],
      medicamentos: ['Noradrenalina', 'Vancomicina', 'Piperacilina-Tazobactam'],
    },
    respiratoryConditions: {
      asma: false,
      epoc: false,
      neumonia: false,
      covid19: false,
      ards: true,
    },
    diagnosticStudies: {
      radiografiaTorax: 'Radiografía de tórax PA: Infiltrados alveolares bilaterales difusos, patrón de vidrio esmerilado, silueta cardíaca normal, sin cardiomegalia. Compatible con ARDS.',
      gasesArteriales: 'pH: 7.30, PaO2: 63 mmHg, PaCO2: 45 mmHg, HCO3-: 20 mEq/L, BE: -3, SaO2: 89%, FiO2: 80%, PaO2/FiO2: 79 (ARDS severo), Lactato: 4.2 mmol/L',
      hemogramaCompleto: 'Hb: 9.8 g/dL, Hto: 29%, Leucocitos: 22,400/µL (Neutrófilos: 92%, Bandas: 15%), Plaquetas: 85,000/µL, VSG: 120 mm/h, PCR: 45 mg/dL, PCT: 8.5 ng/mL',
      electrolitosFuncionRenal: 'Na+: 132 mEq/L, K+: 4.2 mEq/L, Creatinina: 2.1 mg/dL, BUN: 45 mg/dL, Glucosa: 220 mg/dL, Lactato: 4.2 mmol/L',
      diagnosticoPrincipal: 'Síndrome de distrés respiratorio agudo (SDRA moderado a severo) secundario a sepsis abdominal',
      diagnosticoSecundario: 'Shock séptico, Peritonitis secundaria, Disfunción multiorgánica incipiente',
      condicionAsociada: 'Insuficiencia renal aguda, Coagulopatía, Acidosis metabólica',
      planAccionInmediato: 'VCV: Vt 6ml/kg (420ml), FR 20-24rpm, FiO₂ 80-100% titular, PEEP 10-12 cmH₂O, I:E 1:1.5 o 1:2, Plato <30 cmH₂O. Soporte vasopresor, control de foco séptico.'
    },
    calculatedParams: {
      volumenTidal: 420,
      peepRecomendado: 11,
      fio2Inicial: 90,
      frecuenciaResp: 22,
    }
  }
};

// Datos adicionales para diferentes tipos de pacientes
export const patientProfiles = {
  covid_severe: simulatedPatientData,
  
  asma_exacerbation: {
    patientBasicData: {
      nombre: 'Carlos',
      apellido: 'Mendoza',
      tipoDocumento: 'Cédula de Ciudadanía',
      documento: '0987654321',
      fechaNacimiento: '1990-07-22',
      edad: 33,
      sexo: 'masculino',
      segundoNombre: '',
      segundoApellido: 'López',
      direccion: 'Carrera 45 #78-90, Barrio El Poblado',
      telefonoResidencia: '555-4567',
      contactoEmergenciaNombre: 'Ana Mendoza (Hermana)',
      contactoEmergenciaTelefono: '555-7890',
      pesoActual: '75',
      estatura: '175',
      pesoCorporalIdeal: '68.6',
      imc: '24.5',
    },
    clinicalData: {
      frecuenciaCardiaca: '125',
      frecuenciaRespiratoria: '32',
      tensionArterialSistolica: '130',
      tensionArterialDiastolica: '80',
      saturacionOxigeno: '90',
      temperatura: '37.1',
      inspeccionGeneral: 'Paciente masculino joven, ansioso, con dificultad respiratoria severa, uso de músculos accesorios, posición de trípode, habla entrecortada.',
      palpacionTorax: 'Expansión torácica limitada, tórax hiperinsuflado, frémito vocal disminuido bilateralmente.',
      percusionTorax: 'Hiperresonancia generalizada, diafragmas descendidos.',
      auscultacionPulmonar: 'Sibilancias espiratorias e inspiratorias difusas, murmullo vesicular muy disminuido, tiempo espiratorio prolongado.',
      auscultacionCardiaca: 'Taquicardia, ruidos cardíacos rítmicos, sin soplos.',
      escalaGlasgow: '15',
      diagnostico: '',
      alergias: [],
      medicamentos: [],
    },
    respiratoryConditions: {
      asma: true,
      epoc: false,
      neumonia: false,
      covid19: false,
      ards: false,
    },
    diagnosticStudies: {
      radiografiaTorax: 'Hiperinsuflación pulmonar bilateral, diafragmas aplanados y descendidos, espacios intercostales aumentados. Corazón en gota. No consolidaciones.',
      diagnosticoPrincipal: 'Crisis Asmática Severa (Asma Bronquial Exacerbado)',
      diagnosticoSecundario: 'Asma bronquial alérgica de larga evolución',
      condicionAsociada: 'Probable desencadenante alérgico estacional',
      planAccionInmediato: 'Broncodilatadores nebulizados, corticosteroides sistémicos, oxigenoterapia, monitoreo continuo'
    }
  },

  // Agregar los casos predefinidos al objeto de perfiles
  ...predefinedClinicalCases
}; 