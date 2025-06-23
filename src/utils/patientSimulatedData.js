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
  }
}; 