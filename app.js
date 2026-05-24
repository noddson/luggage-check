import { estimateFit } from './fitEstimator.js';

const VEHICLE_INDEX_PATH = './configs/vehicles/index.json';

const BAG_COLORS = ['#2563eb', '#16a34a', '#f97316', '#9333ea', '#0891b2', '#e11d48', '#ca8a04', '#4f46e5'];
const DEFAULT_SEAT_BACK_ANGLE_DEGREES = 20;
const DEFAULT_MAX_QUANTITY_BY_SIZE = {
  large: 12,
  medium: 24,
  small: 36,
  verySmall: 50
};
const state = {
  luggageSet: null,
  vehicles: [],
  vehicleId: '',
  configurationId: '',
  activeView: '3d',
  seatBackEncroachmentAngleDegrees: DEFAULT_SEAT_BACK_ANGLE_DEGREES,
  rotation3d: { yaw: 315, pitch: 60 },
  activeOrientationLabel: '',
  language: 'en'
};

const LANGUAGE_COOKIE_NAME = 'preferredLanguage';
const LANGUAGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const I18N = {
  en: {
    pageTitle: 'Luggage Check',
    eyebrow: 'Rental car luggage planner',
    heroTitle: 'Pick a vehicle setup and see whether your bags fit.',
    heroCopy: 'Compare European rental-car cargo configurations, tune the luggage list, and visualize the estimated placement in each cargo zone before you book.',
    bagsFit: 'All bags fit',
    bagsUnplaced: 'Some bags unplaced',
    fitScore: 'Fit score',
    usableVolume: 'Usable volume',
    fitResult: 'Fit result'
    ,configuration: 'Configuration', tripSetup: 'Trip setup', vehicle: 'Vehicle', seatCargoConfig: 'Seat / cargo configuration', rearAngle: 'Rear seat-back encroachment angle', seatBackNote: 'Sloped rear seat backs constrain upper-depth clearance.', luggage: 'Luggage', bagList: 'Bag list', reset: 'Reset', visualization: 'Visualization', bootViz: 'Boot Luggage Fit Visualization', placedLuggage: 'Placed luggage', needsAnotherPlan: 'Needs another plan', workspaceAria: 'Luggage fit workspace', orientation: 'Orientation', pitch: 'Pitch', yaw: 'Yaw', dragHint: 'Drag to pivot around cargo centre · click X/Y/Z for axis presets', noBagsInZone: 'No bags placed in this zone.', nothingPlacedYet: 'Nothing placed yet. Add luggage quantities to begin.', allPlaced: 'Every selected bag is placed in the active configuration.',
    seats: 'seats', quantityFor: 'Quantity for {item}', noSeatEncroachment: 'No active cargo zone defines sloped rear seat-back encroachment.', seatBackOverrideNote: 'Sloped rear seat backs constrain upper-depth clearance. Vehicle default: {angle}°; edit the degree angle to override it.',
    length: 'length', width: 'width', height: 'height', seatEncroachmentEnvelope: 'Seat-back encroachment envelope', forwardSeats: 'Forward seats', front: 'front',
    bootView: 'Boot view', sideView: 'Side view', topView: 'Top view', switchTo: 'Switch to {view}', axisTitle: '{axis} axis · {view}', orientationAxisControl: '3D orientation axis control', yawLabel: 'yaw', pitchLabel: 'pitch',
    zone3dAria: 'rotatable 3D luggage view', removeOne: 'Remove one {item}', placedSummary: '{placed}/{total} bags placed', usedVolume: '{used} L used', placedCount: '{placed} placed · {unplaced} unplaced', volumeUsedPercent: '{percent}% usable volume used',
    loadErrorTitle: 'Unable to load app', fitResultTitle: 'Estimated cargo fit', loading: 'Loading', languageSelector: 'Language selector', visualizationView: 'Visualization view', scaledDrawing: 'Scaled luggage placement drawing', seatWedgeTitle: 'Seat-back encroachment wedge: {angle}°', zoneViewAria: '{zone} · {view} view', seatGuideTitle: 'Forward seat outline'
  },
  xx: {
    pageTitle: "Luggage Check",
    eyebrow: "Hire-car cargo planner",
    heroTitle: "Pick a vehicle setup and see whether your bags fit.",
    heroCopy: "Compare European rental-car cargo configurations, tune the luggage list, and visualize the estimated placement in each cargo zone before you book.",
    bagsFit: "All bags be stowed",
    bagsUnplaced: "Some bags be adrift",
    fitScore: "Stow score",
    usableVolume: "Usable hold",
    fitResult: "Stow result",
    configuration: "Riggin'",
    tripSetup: "Voyage setup",
    vehicle: "Vessel",
    seatCargoConfig: "Seat / cargo configuration",
    rearAngle: "Aft seat-back encroachment angle",
    seatBackNote: "Sloped rear seat backs constrain upper-depth clearance.",
    luggage: "Cargo",
    bagList: "Loot list",
    reset: "Reset yer haul",
    visualization: "Chartin' view",
    bootViz: "Boot Cargo Fit Chartin' view",
    placedLuggage: "Stowed cargo",
    needsAnotherPlan: "Needs new course",
    workspaceAria: "Cargo fit workspace",
    orientation: "Orientation",
    pitch: "Pitch",
    yaw: "Yaw",
    dragHint: "Drag to pivot around cargo centre · click X/Y/Z for axis presets",
    noBagsInZone: "No bags placed in this zone.",
    nothingPlacedYet: "Nothing placed yet. Add luggage quantities to begin.",
    allPlaced: "Every selected bag is placed in the active configuration.",
    seats: "seats",
    quantityFor: "Quantity for {item}",
    noSeatEncroachment: "No active cargo zone defines sloped rear seat-back encroachment.",
    seatBackOverrideNote: "Sloped rear seat backs constrain upper-depth clearance. Vessel default: {angle}°; edit the degree angle to override it.",
    length: "length",
    width: "width",
    height: "height",
    seatEncroachmentEnvelope: "Seat-back encroachment envelope",
    forwardSeats: "Forward seats",
    front: "bow",
    bootView: "Boot view",
    sideView: "Side view",
    topView: "Top view",
    switchTo: "Switch to {view}",
    axisTitle: "{axis} axis · {view}",
    orientationAxisControl: "3D orientation axis control",
    yawLabel: "yaw",
    pitchLabel: "pitch",
    zone3dAria: "rotatable 3D luggage view",
    removeOne: "Remove one {item}",
    placedSummary: "{placed}/{total} bags placed",
    usedVolume: "{used} L used",
    placedCount: "{placed} placed · {unplaced} unplaced",
    volumeUsedPercent: "{percent}% usable volume used",
    loadErrorTitle: "Can't hoist the app",
    fitResultTitle: "Estimated cargo stowage",
    loading: "Hoistin'",
    languageSelector: "Tongue chooser",
    visualizationView: "Chartin' view view",
    scaledDrawing: "Scaled luggage placement drawing",
    seatWedgeTitle: "Seat-back encroachment wedge: {angle}°",
    zoneViewAria: "{zone} · {view} view",
    seatGuideTitle: "Forward seat outline"
  },
  el: {
    pageTitle: 'Έλεγχος Αποσκευών',
    eyebrow: 'Σχεδιασμός αποσκευών για ενοικιαζόμενο αυτοκίνητο',
    heroTitle: 'Επίλεξε διάταξη οχήματος και δες αν χωρούν οι αποσκευές σου.',
    heroCopy: 'Σύγκρινε διαμορφώσεις χώρου αποσκευών ευρωπαϊκών ενοικιαζόμενων αυτοκινήτων, προσαρμόσε τη λίστα αποσκευών και δες την εκτιμώμενη τοποθέτηση σε κάθε ζώνη φόρτωσης πριν από την κράτηση.',
    bagsFit: 'Χωρούν όλες οι αποσκευές',
    bagsUnplaced: 'Κάποιες αποσκευές δεν χωρούν',
    fitScore: 'Δείκτης εφαρμογής',
    usableVolume: 'Χρήσιμος όγκος',
    fitResult: 'Αποτέλεσμα εφαρμογής',
    configuration: 'Διαμόρφωση', tripSetup: 'Ρύθμιση ταξιδιού', vehicle: 'Όχημα', seatCargoConfig: 'Διαμόρφωση καθισμάτων / χώρου φόρτωσης', rearAngle: 'Γωνία κλίσης πλάτης πίσω καθισμάτων', seatBackNote: 'Οι κεκλιμένες πλάτες πίσω καθισμάτων μειώνουν το διαθέσιμο άνω βάθος.', luggage: 'Αποσκευές', bagList: 'Λίστα αποσκευών', reset: 'Επαναφορά', visualization: 'Οπτικοποίηση', bootViz: 'Οπτικοποίηση εφαρμογής αποσκευών στο πορτμπαγκάζ', placedLuggage: 'Τοποθετημένες αποσκευές', needsAnotherPlan: 'Χρειάζεται άλλο πλάνο', workspaceAria: 'Χώρος εργασίας εφαρμογής αποσκευών', orientation: 'Προσανατολισμός', pitch: 'Κλίση', yaw: 'Περιστροφή', dragHint: 'Σύρε για περιστροφή γύρω από το κέντρο φόρτωσης · πάτησε X/Y/Z για προεπιλογές αξόνων', noBagsInZone: 'Δεν υπάρχουν αποσκευές σε αυτή τη ζώνη.', nothingPlacedYet: 'Δεν έχει τοποθετηθεί τίποτα ακόμη. Πρόσθεσε ποσότητες για να ξεκινήσεις.', allPlaced: 'Όλες οι επιλεγμένες αποσκευές έχουν τοποθετηθεί στην ενεργή διαμόρφωση.',
    seats: 'καθίσματα', quantityFor: 'Ποσότητα για {item}', noSeatEncroachment: 'Καμία ενεργή ζώνη φόρτωσης δεν ορίζει κεκλιμένη πλάτη πίσω καθισμάτων.', seatBackOverrideNote: 'Οι κεκλιμένες πλάτες πίσω καθισμάτων μειώνουν το διαθέσιμο άνω βάθος. Προεπιλογή οχήματος: {angle}°· άλλαξε τη γωνία για παράκαμψη.',
    length: 'μήκος', width: 'πλάτος', height: 'ύψος', seatEncroachmentEnvelope: 'Ζώνη κλίσης πλάτης πίσω καθισμάτων', forwardSeats: 'Μπροστινά καθίσματα', front: 'μπροστά',
    bootView: 'Πίσω χώρος', sideView: 'Πλάγια όψη', topView: 'Κάτοψη', switchTo: 'Μετάβαση σε {view}', axisTitle: 'Άξονας {axis} · {view}', orientationAxisControl: 'Έλεγχος αξόνων προσανατολισμού 3D', yawLabel: 'περιστροφή', pitchLabel: 'κλίση',
    zone3dAria: 'περιστρεφόμενη προβολή αποσκευών 3D', removeOne: 'Αφαίρεση ενός {item}', placedSummary: '{placed}/{total} αποσκευές τοποθετημένες', usedVolume: '{used} L χρησιμοποιούνται', placedCount: '{placed} τοποθετημένες · {unplaced} μη τοποθετημένες', volumeUsedPercent: '{percent}% του χρήσιμου όγκου χρησιμοποιείται',
    loadErrorTitle: 'Αδυναμία φόρτωσης εφαρμογής', fitResultTitle: 'Εκτιμώμενη εφαρμογή χώρου αποσκευών', loading: 'Φόρτωση', languageSelector: 'Επιλογή γλώσσας', visualizationView: 'Προβολή οπτικοποίησης', scaledDrawing: 'Σχεδίαση κλίμακας τοποθέτησης αποσκευών', seatWedgeTitle: 'Σφήνα κλίσης πλάτης καθίσματος: {angle}°', zoneViewAria: '{zone} · προβολή {view}', seatGuideTitle: 'Περίγραμμα μπροστινών καθισμάτων'
  },
  de: {
    pageTitle: 'Gepäck-Check',
    eyebrow: 'Gepäckplaner für Mietwagen',
    heroTitle: 'Wähle eine Fahrzeugkonfiguration und prüfe, ob dein Gepäck passt.',
    heroCopy: 'Vergleiche Kofferraumkonfigurationen europäischer Mietwagen, passe die Gepäckliste an und visualisiere die geschätzte Platzierung in jeder Ladezone vor der Buchung.',
    bagsFit: 'Alle Gepäckstücke passen',
    bagsUnplaced: 'Einige Gepäckstücke passen nicht',
    fitScore: 'Passgenauigkeit',
    usableVolume: 'Nutzbares Volumen',
    fitResult: 'Ergebnis',
    configuration: 'Konfiguration', tripSetup: 'Reiseeinstellungen', vehicle: 'Fahrzeug', seatCargoConfig: 'Sitz- / Laderaumkonfiguration', rearAngle: 'Winkel der Rücksitzlehnen-Einengung', seatBackNote: 'Geneigte Rücksitzlehnen reduzieren die obere Tiefenfreiheit.', luggage: 'Gepäck', bagList: 'Gepäckliste', reset: 'Zurücksetzen', visualization: 'Visualisierung', bootViz: 'Kofferraum-Gepäck-Visualisierung', placedLuggage: 'Platziertes Gepäck', needsAnotherPlan: 'Braucht anderen Plan', workspaceAria: 'Arbeitsbereich zur Gepäckanpassung', orientation: 'Ausrichtung', pitch: 'Neigung', yaw: 'Drehung', dragHint: 'Zum Drehen um den Ladebereich ziehen · X/Y/Z für Achsenvorgaben anklicken', noBagsInZone: 'In dieser Zone ist kein Gepäck platziert.', nothingPlacedYet: 'Noch nichts platziert. Füge Mengen hinzu, um zu starten.', allPlaced: 'Alle ausgewählten Gepäckstücke sind in der aktiven Konfiguration platziert.',
    seats: 'Sitze', quantityFor: 'Menge für', noSeatEncroachment: 'Keine aktive Ladezone definiert eine geneigte Rücksitzlehnen-Einengung.', seatBackOverrideNote: 'Geneigte Rücksitzlehnen reduzieren die obere Tiefenfreiheit. Fahrzeugstandard: {angle}°; ändere den Winkel, um ihn zu überschreiben.',
    length: 'Länge', width: 'Breite', height: 'Höhe', seatEncroachmentEnvelope: 'Rücksitzlehnen-Einengungsbereich', forwardSeats: 'Vordersitze', front: 'vorne',
    bootView: 'Kofferraumansicht', sideView: 'Seitenansicht', topView: 'Draufsicht', switchTo: 'Wechseln zu {view}', axisTitle: '{axis}-Achse · {view}', orientationAxisControl: '3D-Ausrichtungsachsensteuerung', yawLabel: 'Drehung', pitchLabel: 'Neigung',
    zone3dAria: 'Drehbare 3D-Gepäckansicht', removeOne: 'Eins entfernen: {item}', placedSummary: '{placed}/{total} Gepäckstücke platziert', usedVolume: '{used} L genutzt', placedCount: '{placed} platziert · {unplaced} nicht platziert', volumeUsedPercent: '{percent}% des nutzbaren Volumens verwendet',
    loadErrorTitle: 'App konnte nicht geladen werden', fitResultTitle: 'Geschätzte Laderaumpassung', loading: 'Lädt', languageSelector: 'Sprachauswahl', visualizationView: 'Visualisierungsansicht', scaledDrawing: 'Skalierte Zeichnung der Gepäckplatzierung', seatWedgeTitle: 'Rücksitzlehnen-Einengungskeil: {angle}°', zoneViewAria: '{zone} · Ansicht {view}', seatGuideTitle: 'Kontur der Vordersitze'
  },
  fr: {
    pageTitle: 'Vérification des bagages',
    eyebrow: 'Planificateur de bagages pour voiture de location',
    heroTitle: 'Choisissez une configuration de véhicule et vérifiez si vos bagages rentrent.',
    heroCopy: 'Comparez les configurations de coffre des voitures de location européennes, ajustez la liste des bagages et visualisez leur placement estimé dans chaque zone du coffre avant de réserver.',
    bagsFit: 'Tous les bagages rentrent',
    bagsUnplaced: 'Certains bagages ne rentrent pas',
    fitScore: 'Score de compatibilité',
    usableVolume: 'Volume utilisable',
    fitResult: 'Résultat',
    configuration: 'Configuration', tripSetup: 'Préparation du trajet', vehicle: 'Véhicule', seatCargoConfig: 'Configuration sièges / coffre', rearAngle: 'Angle d’inclinaison du dossier arrière', seatBackNote: 'Les dossiers arrière inclinés réduisent la profondeur disponible en hauteur.', luggage: 'Bagages', bagList: 'Liste des bagages', reset: 'Réinitialiser', visualization: 'Visualisation', bootViz: 'Visualisation de l’ajustement des bagages du coffre', placedLuggage: 'Bagages placés', needsAnotherPlan: 'À replacer', workspaceAria: 'Espace de vérification des bagages', orientation: 'Orientation', pitch: 'Angle de tangage', yaw: 'Angle de lacet', dragHint: 'Faites glisser pour pivoter autour du centre de chargement · cliquez sur X/Y/Z pour les axes prédéfinis', noBagsInZone: 'Aucun bagage placé dans cette zone.', nothingPlacedYet: 'Rien n’est placé pour le moment. Ajoutez des quantités pour commencer.', allPlaced: 'Tous les bagages sélectionnés sont placés dans la configuration active.',
    seats: 'sièges', quantityFor: 'Quantité pour {item}', noSeatEncroachment: 'Aucune zone de chargement active ne définit d’inclinaison de dossier arrière.', seatBackOverrideNote: 'Les dossiers arrière inclinés réduisent la profondeur disponible en hauteur. Valeur par défaut du véhicule : {angle}° ; modifiez l’angle pour la remplacer.',
    length: 'longueur', width: 'largeur', height: 'hauteur', seatEncroachmentEnvelope: 'Zone d’inclinaison du dossier arrière', forwardSeats: 'Sièges avant', front: 'avant',
    bootView: 'Vue du coffre', sideView: 'Vue latérale', topView: 'Vue du dessus', switchTo: 'Basculer vers {view}', axisTitle: 'Axe {axis} · {view}', orientationAxisControl: 'Contrôle de l’axe d’orientation 3D', yawLabel: 'lacet', pitchLabel: 'tangage',
    zone3dAria: 'vue 3D rotative des bagages', removeOne: 'Retirer un {item}', placedSummary: '{placed}/{total} bagages placés', usedVolume: '{used} L utilisés', placedCount: '{placed} placés · {unplaced} non placés', volumeUsedPercent: '{percent}% du volume utilisable utilisé',
    loadErrorTitle: 'Impossible de charger l’application', fitResultTitle: 'Ajustement estimé du coffre', loading: 'Chargement', languageSelector: 'Sélecteur de langue', visualizationView: 'Vue de visualisation', scaledDrawing: 'Dessin à l’échelle du placement des bagages', seatWedgeTitle: 'Coin d’inclinaison du dossier arrière : {angle}°', zoneViewAria: '{zone} · vue {view}', seatGuideTitle: 'Contour des sièges avant'
  },
  it: {
    pageTitle: 'Verifica bagagli',
    eyebrow: 'Pianificatore bagagli per auto a noleggio',
    heroTitle: 'Scegli una configurazione del veicolo e verifica se i bagagli entrano.',
    heroCopy: 'Confronta le configurazioni del bagagliaio delle auto a noleggio europee, regola la lista bagagli e visualizza il posizionamento stimato in ogni zona di carico prima di prenotare.',
    bagsFit: 'Tutti i bagagli entrano',
    bagsUnplaced: 'Alcuni bagagli non trovano posto',
    fitScore: 'Indice di compatibilità',
    usableVolume: 'Volume utile',
    fitResult: 'Risultato',
    configuration: 'Configurazione', tripSetup: 'Impostazione del viaggio', vehicle: 'Veicolo', seatCargoConfig: 'Configurazione sedili / vano di carico', rearAngle: 'Angolo di ingombro dello schienale posteriore', seatBackNote: 'Gli schienali posteriori inclinati riducono la profondità disponibile nella parte alta.', luggage: 'Bagagli', bagList: 'Lista bagagli', reset: 'Reimposta', visualization: 'Visualizzazione', bootViz: 'Visualizzazione del posizionamento bagagli nel bagagliaio', placedLuggage: 'Bagagli posizionati', needsAnotherPlan: 'Da ripianificare', workspaceAria: 'Area di verifica della disposizione bagagli', orientation: 'Orientamento', pitch: 'Inclinazione', yaw: 'Rotazione', dragHint: 'Trascina per ruotare intorno al centro del vano · fai clic su X/Y/Z per le viste preimpostate', noBagsInZone: 'Nessun bagaglio posizionato in questa zona.', nothingPlacedYet: 'Non è ancora stato posizionato nulla. Aggiungi le quantità per iniziare.', allPlaced: 'Tutti i bagagli selezionati sono stati posizionati nella configurazione attiva.',
    seats: 'posti', quantityFor: 'Quantità per {item}', noSeatEncroachment: 'Nessuna zona di carico attiva prevede un ingombro inclinato dello schienale posteriore.', seatBackOverrideNote: 'Gli schienali posteriori inclinati riducono la profondità disponibile nella parte alta. Valore predefinito del veicolo: {angle}°; modifica l’angolo per sovrascriverlo.',
    length: 'lunghezza', width: 'larghezza', height: 'altezza', seatEncroachmentEnvelope: 'Area di ingombro dello schienale posteriore', forwardSeats: 'Sedili anteriori', front: 'davanti',
    bootView: 'Vista bagagliaio', sideView: 'Vista laterale', topView: 'Vista dall’alto', switchTo: 'Passa a {view}', axisTitle: 'Asse {axis} · {view}', orientationAxisControl: 'Controllo assi orientamento 3D', yawLabel: 'rotazione', pitchLabel: 'inclinazione',
    zone3dAria: 'vista 3D ruotabile dei bagagli', removeOne: 'Rimuovi un {item}', placedSummary: '{placed}/{total} bagagli posizionati', usedVolume: '{used} L usati', placedCount: '{placed} posizionati · {unplaced} non posizionati', volumeUsedPercent: '{percent}% del volume utile utilizzato',
    loadErrorTitle: 'Impossibile caricare l’app', fitResultTitle: 'Stima di carico bagagliaio', loading: 'Caricamento', languageSelector: 'Selettore lingua', visualizationView: 'Vista visualizzazione', scaledDrawing: 'Disegno in scala del posizionamento bagagli', seatWedgeTitle: 'Cuneo di ingombro dello schienale: {angle}°', zoneViewAria: '{zone} · vista {view}', seatGuideTitle: 'Profilo dei sedili anteriori'
  },
  es: {
    pageTitle: 'Comprobación de equipaje',
    eyebrow: 'Planificador de equipaje para coche de alquiler',
    heroTitle: 'Elige una configuración del vehículo y comprueba si cabe tu equipaje.',
    heroCopy: 'Compara configuraciones de maletero de coches de alquiler europeos, ajusta la lista de equipaje y visualiza la colocación estimada en cada zona de carga antes de reservar.',
    bagsFit: 'Todo el equipaje cabe',
    bagsUnplaced: 'Parte del equipaje no cabe',
    fitScore: 'Índice de ajuste',
    usableVolume: 'Volumen útil',
    fitResult: 'Resultado',
    configuration: 'Configuración', tripSetup: 'Preparación del viaje', vehicle: 'Vehículo', seatCargoConfig: 'Configuración de asientos / carga', rearAngle: 'Ángulo de invasión del respaldo trasero', seatBackNote: 'Los respaldos traseros inclinados reducen la profundidad útil en la parte superior.', luggage: 'Equipaje', bagList: 'Lista de equipaje', reset: 'Restablecer', visualization: 'Visualización', bootViz: 'Visualización del ajuste de equipaje en el maletero', placedLuggage: 'Equipaje colocado', needsAnotherPlan: 'Requiere otro plan', workspaceAria: 'Área de comprobación de equipaje', orientation: 'Orientación', pitch: 'Inclinación', yaw: 'Giro', dragHint: 'Arrastra para girar alrededor del centro de carga · haz clic en X/Y/Z para usar vistas predefinidas', noBagsInZone: 'No hay equipaje colocado en esta zona.', nothingPlacedYet: 'Aún no hay nada colocado. Añade cantidades para empezar.', allPlaced: 'Todo el equipaje seleccionado está colocado en la configuración activa.',
    seats: 'plazas', quantityFor: 'Cantidad para {item}', noSeatEncroachment: 'Ninguna zona de carga activa define invasión inclinada del respaldo trasero.', seatBackOverrideNote: 'Los respaldos traseros inclinados reducen la profundidad útil en la parte superior. Valor por defecto del vehículo: {angle}°; modifica el ángulo para sobrescribirlo.',
    length: 'largo', width: 'ancho', height: 'alto', seatEncroachmentEnvelope: 'Zona de invasión del respaldo trasero', forwardSeats: 'Asientos delanteros', front: 'frente',
    bootView: 'Vista del maletero', sideView: 'Vista lateral', topView: 'Vista superior', switchTo: 'Cambiar a {view}', axisTitle: 'Eje {axis} · {view}', orientationAxisControl: 'Control de ejes de orientación 3D', yawLabel: 'giro', pitchLabel: 'inclinación',
    zone3dAria: 'vista 3D giratoria del equipaje', removeOne: 'Quitar una unidad de {item}', placedSummary: '{placed}/{total} equipajes colocados', usedVolume: '{used} L usados', placedCount: '{placed} colocados · {unplaced} sin colocar', volumeUsedPercent: '{percent}% del volumen útil utilizado',
    loadErrorTitle: 'No se pudo cargar la aplicación', fitResultTitle: 'Ajuste estimado de carga', loading: 'Cargando', languageSelector: 'Selector de idioma', visualizationView: 'Vista de visualización', scaledDrawing: 'Dibujo a escala de la colocación del equipaje', seatWedgeTitle: 'Cuña de invasión del respaldo: {angle}°', zoneViewAria: '{zone} · vista {view}', seatGuideTitle: 'Contorno de los asientos delanteros'
  },
  is: {
    pageTitle: 'Farangurstékk',
    eyebrow: 'Farangursáætlun fyrir bílaleigubíla',
    heroTitle: 'Veldu uppsetningu ökutækis og sjáðu hvort farangurinn kemst fyrir.',
    heroCopy: 'Berðu saman farangursrýmisuppsetningar í evrópskum bílaleigubílum, stilltu farangurslistann og skoðaðu áætlaða staðsetningu í hverju rými áður en þú bókar.',
    bagsFit: 'Allur farangur kemst fyrir',
    bagsUnplaced: 'Hluti farangurs kemst ekki fyrir',
    fitScore: 'Passunarstig',
    usableVolume: 'Nýtanlegt rúmmál',
    fitResult: 'Niðurstaða',
    configuration: 'Uppsetning', tripSetup: 'Ferðauppsetning', vehicle: 'Ökutæki', seatCargoConfig: 'Sæta- / farangursuppsetning', rearAngle: 'Hallahorn aftursætisbaks', seatBackNote: 'Hallandi aftursætisbök draga úr nýtanlegri dýpt efst.', luggage: 'Farangur', bagList: 'Farangurslisti', reset: 'Endurstilla', visualization: 'Myndræn framsetning', bootViz: 'Myndræn passun farangurs í skotti', placedLuggage: 'Farangur sem er kominn fyrir', needsAnotherPlan: 'Þarf aðra lausn', workspaceAria: 'Vinnusvæði fyrir farangurspassun', orientation: 'Stefna', pitch: 'Halli', yaw: 'Snúningur', dragHint: 'Dragðu til að snúa um miðju farangursrýmis · smelltu á X/Y/Z fyrir fyrirfram stilltar ásaafstöður', noBagsInZone: 'Enginn farangur er staðsettur í þessu rými.', nothingPlacedYet: 'Ekkert hefur verið staðsett enn. Bættu við magni til að byrja.', allPlaced: 'Allur valinn farangur er staðsettur í virkri uppsetningu.',
    seats: 'sæti', quantityFor: 'Magn fyrir {item}', noSeatEncroachment: 'Ekkert virkt farangursrými skilgreinir halla aftursætisbaks.', seatBackOverrideNote: 'Hallandi aftursætisbök draga úr nýtanlegri dýpt efst. Sjálfgefið horn ökutækis: {angle}°; breyttu gráðutölunni til að yfirskrifa.',
    length: 'lengd', width: 'breidd', height: 'hæð', seatEncroachmentEnvelope: 'Skörunarsvæði aftursætisbaks', forwardSeats: 'Framsæti', front: 'framan',
    bootView: 'Skottsýn', sideView: 'Hliðarsýn', topView: 'Ofansýn', switchTo: 'Skipta í {view}', axisTitle: '{axis}-ás · {view}', orientationAxisControl: 'Stýring fyrir 3D stefnuása', yawLabel: 'snúningur', pitchLabel: 'halli',
    zone3dAria: 'snúanleg 3D sýn á farangur', removeOne: 'Fjarlægja eitt af {item}', placedSummary: '{placed}/{total} farangurseiningar komnar fyrir', usedVolume: '{used} L notað', placedCount: '{placed} komið fyrir · {unplaced} óstaðsett', volumeUsedPercent: '{percent}% af nýtanlegu rúmmáli notað',
    loadErrorTitle: 'Ekki tókst að hlaða forriti', fitResultTitle: 'Áætluð farangurspassun', loading: 'Hleð', languageSelector: 'Val á tungumáli', visualizationView: 'Sýn á framsetningu', scaledDrawing: 'Skölunarteikning af staðsetningu farangurs', seatWedgeTitle: 'Skörunarfleygur aftursætisbaks: {angle}°', zoneViewAria: '{zone} · {view} sýn', seatGuideTitle: 'Útlínur framsæta'
  },
  jp: {
    pageTitle: '荷物チェック',
    eyebrow: 'レンタカー荷物プランナー',
    heroTitle: '車両設定を選んで、荷物が載るかを確認しましょう。',
    heroCopy: 'ヨーロッパのレンタカーの荷室構成を比較し、荷物リストを調整して、予約前に各荷室ゾーンへの推定配置を可視化できます。',
    bagsFit: 'すべての荷物を積載できます',
    bagsUnplaced: '積載できない荷物があります',
    fitScore: '積載適合スコア',
    usableVolume: '使用可能容量',
    fitResult: '積載結果',
    configuration: '構成', tripSetup: '旅行設定', vehicle: '車両', seatCargoConfig: 'シート / 荷室構成', rearAngle: '後席背もたれの張り出し角度', seatBackNote: '傾斜した後席背もたれは上部の奥行きクリアランスを制限します。', luggage: '荷物', bagList: '荷物リスト', reset: 'リセット', visualization: '可視化', bootViz: '荷室の荷物積載可視化', placedLuggage: '積載済みの荷物', needsAnotherPlan: '再検討が必要', workspaceAria: '荷物積載の作業エリア', orientation: '向き', pitch: 'ピッチ', yaw: 'ヨー', dragHint: 'ドラッグして荷室中心を軸に回転 · X/Y/Z をクリックして軸プリセットを適用', noBagsInZone: 'このゾーンには荷物が配置されていません。', nothingPlacedYet: 'まだ配置されていません。数量を追加して開始してください。', allPlaced: '選択した荷物はすべて現在の構成に配置されています。',
    seats: '席', quantityFor: '{item} の数量', noSeatEncroachment: '有効な荷室ゾーンに後席背もたれの張り出し設定はありません。', seatBackOverrideNote: '傾斜した後席背もたれは上部の奥行きクリアランスを制限します。車両の既定値: {angle}°。上書きするには角度を編集してください。',
    length: '長さ', width: '幅', height: '高さ', seatEncroachmentEnvelope: '背もたれ張り出し領域', forwardSeats: '前席', front: '前方',
    bootView: '荷室ビュー', sideView: '側面ビュー', topView: '上面ビュー', switchTo: '{view} に切り替え', axisTitle: '{axis} 軸 · {view}', orientationAxisControl: '3D 向き軸コントロール', yawLabel: 'ヨー', pitchLabel: 'ピッチ',
    zone3dAria: '回転可能な3D荷物ビュー', removeOne: '{item} を1つ削除', placedSummary: '{total} 個中 {placed} 個を配置', usedVolume: '{used} L 使用', placedCount: '配置済み {placed} · 未配置 {unplaced}', volumeUsedPercent: '使用可能容量の {percent}% を使用',
    loadErrorTitle: 'アプリを読み込めませんでした', fitResultTitle: '推定積載結果', loading: '読み込み中', languageSelector: '言語セレクター', visualizationView: '可視化ビュー', scaledDrawing: '荷物配置の縮尺図', seatWedgeTitle: '背もたれ張り出しウェッジ: {angle}°', zoneViewAria: '{zone} · {view} ビュー', seatGuideTitle: '前席の輪郭'
  }};
const localeBundle = () => I18N[state.language] ?? I18N.en;
const t = (key) => localeBundle()[key] ?? I18N.en[key] ?? key;

function localizeEntity(entity, key) {
  const value = entity?.[key];
  if (typeof value === 'string' && value.startsWith('@i18n:')) {
    const token = value.slice(6);
    return entity?.translations?.[state.language]?.[token]
      ?? entity?.translations?.en?.[token]
      ?? token;
  }
  return entity?.translations?.[state.language]?.[key] ?? entity?.translations?.en?.[key] ?? value;
}

const $ = (selector) => document.querySelector(selector);
function createEl(tag, { className = '', text = '', attrs = {} } = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== '') el.textContent = text;
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
  return el;
}
function setSanitizedMarkup(element, markup) {
  // Markup rendered here is generated by local application code (not user-entered HTML).
  // Keep the assignment isolated in one utility to make future sanitizer swaps easy.
  element.innerHTML = markup;
}
const vehicleSelect = $('#vehicleSelect');
const configurationSelect = $('#configurationSelect');
const seatBackEncroachmentDegreesInput = $('#seatBackEncroachmentDegrees');
const seatBackEncroachmentNote = $('#seatBackEncroachmentNote');
const luggageControls = $('#luggageControls');
const resetLuggageButton = $('#resetLuggageButton');
const visualization = $('#visualization');

async function readJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json();
}

async function loadVehicles() {
  const vehicleIndex = await readJson(VEHICLE_INDEX_PATH);
  return Promise.all(vehicleIndex.files.map((file) => readJson(`./configs/vehicles/${file}`)));
}

function dimensionsLabel(dimensions) {
  return `${Math.round(dimensions.length)} × ${Math.round(dimensions.width)} × ${Math.round(dimensions.height)} mm`;
}

function defaultMaxQuantity(item) {
  const volumeMm3 = item.dimensionsMm.length * item.dimensionsMm.width * item.dimensionsMm.height;
  if (volumeMm3 >= 60_000_000) return DEFAULT_MAX_QUANTITY_BY_SIZE.large;
  if (volumeMm3 >= 20_000_000) return DEFAULT_MAX_QUANTITY_BY_SIZE.medium;
  if (volumeMm3 >= 3_000_000) return DEFAULT_MAX_QUANTITY_BY_SIZE.small;
  return DEFAULT_MAX_QUANTITY_BY_SIZE.verySmall;
}

function maxQuantityForItem(item) {
  return Math.max(1, Number(item.maxQuantity) || defaultMaxQuantity(item));
}

function defaultSeatBackAngleDegrees(zones) {
  return zones.find((zone) => zone.seatBackEncroachment)?.seatBackEncroachment?.angleFromVerticalDegrees ?? DEFAULT_SEAT_BACK_ANGLE_DEGREES;
}

function seatBackAngleDegrees(zone) {
  return zone.seatBackEncroachment ? state.seatBackEncroachmentAngleDegrees : (zone.seatBackEncroachment?.angleFromVerticalDegrees ?? DEFAULT_SEAT_BACK_ANGLE_DEGREES);
}

function seatBackEncroachmentMmAtHeight(zone, heightMm) {
  return heightMm * Math.tan(seatBackAngleDegrees(zone) * (Math.PI / 180));
}

function hasActiveSeatBackEncroachment(zones) {
  return zones.some((zone) => zone.seatBackEncroachment);
}

function vehicleLabel(vehicle) {
  const make = localizeEntity(vehicle, 'make');
  const model = localizeEntity(vehicle, 'model');
  const bodyStyle = localizeEntity(vehicle, 'bodyStyle');
  return `${make} ${model} (${bodyStyle})`;
}

function cloneLuggageWithQuantities() {
  return {
    ...state.luggageSet,
    items: state.luggageSet.items.map((item) => ({
      ...item,
      quantity: Math.min(maxQuantityForItem(item), Math.max(0, Number($(`#qty-${item.id}`).value)))
    })).filter((item) => item.quantity > 0)
  };
}

function defaultVehicle() {
  return state.vehicles.find((vehicle) => vehicle.isDefault) ?? state.vehicles[0];
}

function selectedVehicle() {
  return state.vehicles.find((vehicle) => vehicle.id === state.vehicleId) ?? defaultVehicle();
}

function selectedConfiguration(vehicle = selectedVehicle()) {
  return vehicle.seatConfigurations.find((config) => config.id === state.configurationId) ?? vehicle.seatConfigurations[0];
}

function renderVehicleOptions() {
  vehicleSelect.replaceChildren(...state.vehicles.map((vehicle) => createEl('option', {
    text: vehicleLabel(vehicle),
    attrs: { value: vehicle.id }
  })));
  vehicleSelect.value = state.vehicleId;
}

function renderConfigurationOptions() {
  const vehicle = selectedVehicle();
  configurationSelect.replaceChildren(...vehicle.seatConfigurations.map((config) => createEl('option', {
    text: `${localizeEntity(config, 'label')} · ${config.seatsAvailable} ${t('seats')}`,
    attrs: { value: config.id }
  })));
  if (!vehicle.seatConfigurations.some((config) => config.id === state.configurationId)) {
    state.configurationId = vehicle.seatConfigurations[0].id;
  }
  configurationSelect.value = state.configurationId;
}

function renderSeatBackEncroachmentState() {
  const vehicle = selectedVehicle();
  const config = selectedConfiguration(vehicle);
  const zones = config.cargoZoneIds.map((id) => vehicle.cargoZones.find((zone) => zone.id === id)).filter(Boolean);
  renderSeatBackEncroachmentControl(zones);
}

function renderSeatBackEncroachmentControl(zones) {
  const defaultAngle = defaultSeatBackAngleDegrees(zones);
  const hasEncroachment = hasActiveSeatBackEncroachment(zones);
  seatBackEncroachmentDegreesInput.value = state.seatBackEncroachmentAngleDegrees;
  seatBackEncroachmentDegreesInput.disabled = !hasEncroachment;
  seatBackEncroachmentNote.textContent = hasEncroachment
    ? t('seatBackOverrideNote').replace('{angle}', String(defaultAngle))
    : t('noSeatEncroachment');
}

function syncSeatBackEncroachmentDefault() {
  const vehicle = selectedVehicle();
  const config = selectedConfiguration(vehicle);
  const zones = config.cargoZoneIds.map((id) => vehicle.cargoZones.find((zone) => zone.id === id)).filter(Boolean);
  state.seatBackEncroachmentAngleDegrees = defaultSeatBackAngleDegrees(zones);
}

function resetLuggageQuantities() {
  luggageControls.querySelectorAll('input').forEach((input) => {
    input.value = 0;
  });
  renderResults();
}

function renderLuggageControls() {
  const controls = state.luggageSet.items.map((item) => {
    const color = colorForSourceId(item.id);
    const article = createEl('article', { className: 'luggage-item', attrs: { style: `--bag-tint:${color};--bag-panel-bg:${mixWithWhite(color, 0.9)}` } });
    const meta = createEl('div');
    meta.append(
      createEl('strong', { text: localizeEntity(item, 'label') }),
      createEl('span', { text: `${dimensionsLabel(item.dimensionsMm)} · ${item.shapeType.replace('_', ' ')}` })
    );
    const label = createEl('label');
    label.append(
      createEl('span', { className: 'sr-only', text: t('quantityFor').replace('{item}', localizeEntity(item, 'label')) }),
      createEl('input', { attrs: { id: `qty-${item.id}`, type: 'number', min: '0', max: String(maxQuantityForItem(item)), step: '1', value: item.quantity } })
    );
    article.append(meta, label);
    return article;
  });
  luggageControls.replaceChildren(...controls);
  luggageControls.querySelectorAll('input').forEach((input) => input.addEventListener('input', renderResults));
}

function metricCard(label, value, detail = '', className = '') {
  const card = createEl('article', { className: ['metric', className].filter(Boolean).join(' ') });
  card.append(createEl('span', { text: label }), createEl('strong', { text: value }));
  if (detail) card.append(createEl('small', { text: detail }));
  return card;
}

function colorForSourceId(sourceId) {
  const uniqueSources = [...new Set(estimateSources().map((item) => item.id))];
  const index = uniqueSources.indexOf(sourceId);
  return BAG_COLORS[(index < 0 ? 0 : index) % BAG_COLORS.length];
}

function colorForPlacement(placement) {
  const source = placement.sourceId ?? placement.itemId.split('#')[0];
  return colorForSourceId(source);
}


function localizedPlacementLabel(entry) {
  const sourceId = entry.sourceId ?? (entry.itemId ? entry.itemId.split('#')[0] : null);
  const item = state.luggageSet?.items?.find((candidate) => candidate.id === sourceId);
  if (item) return localizeEntity(item, 'label');
  if (entry?.label) {
    const directLabel = localizeEntity(entry, 'label');
    if (directLabel !== 'label') return directLabel;
  }
  return entry.label ?? sourceId ?? '';
}

function localizedZoneLabel(label, zoneId) {
  const vehicle = selectedVehicle();
  const zone = vehicle?.cargoZones?.find((candidate) => candidate.id === zoneId);
  if (!zone) return label;
  return localizeEntity(zone, 'label');
}

function estimateSources() {
  return state.luggageSet?.items ?? [];
}

function projectBox(placement, view) {
  const { positionMm: position, orientationMm: size } = placement;
  if (view === 'side') return { x: position.x, y: position.z, width: size.length, height: size.height };
  if (view === 'front') return { x: position.y, y: position.z, width: size.width, height: size.height };
  return { x: position.x, y: position.y, width: size.length, height: size.width };
}

function projectZone(zone, view) {
  const dimensions = zone.dimensionsMm;
  if (view === 'side') return { width: dimensions.length, height: dimensions.height, xLabel: t('length'), yLabel: t('height') };
  if (view === 'front') return { width: dimensions.width, height: dimensions.height, xLabel: t('width'), yLabel: t('height') };
  return { width: dimensions.length, height: dimensions.width, xLabel: t('length'), yLabel: t('width') };
}

function seatEncroachmentOverlay(zone, projection, view, padding, scale) {
  if (view !== 'side' || !hasActiveSeatBackEncroachment([zone]) || !zone.dimensionsMm) return '';

  const floorX = padding + projection.width * scale;
  const topX = padding + Math.max(0, projection.width - seatBackEncroachmentMmAtHeight(zone, zone.dimensionsMm.height)) * scale;
  const floorY = padding + projection.height * scale;
  const topY = padding;
  return `
    <g aria-label="${t('seatEncroachmentEnvelope')}">
      <polygon class="seat-encroachment-area" points="${floorX},${floorY} ${floorX},${topY} ${topX},${topY}" />
      <line class="seat-encroachment-line" x1="${floorX}" y1="${floorY}" x2="${topX}" y2="${topY}" />
    </g>
  `;
}

function seatOutlineFor2dView(projection, view, padding, scale) {
  const seatFill = '#fef3c7';
  const seatStroke = '#92400e';
  const label = t('forwardSeats');

  if (view === 'side') {
    const x = padding + projection.width * scale + 14;
    const floorY = padding + projection.height * scale;
    const seatWidth = Math.min(58, projection.width * scale * 0.18);
    const seatHeight = Math.min(92, projection.height * scale * 0.7);
    const baseHeight = Math.max(12, seatHeight * 0.28);
    return `
      <g class="seat-outline seat-outline--side" aria-label="${label}">
        <path d="M ${x} ${floorY - baseHeight} h ${seatWidth} q 8 0 8 8 v ${baseHeight - 8} h ${-seatWidth - 8} z" fill="${seatFill}" stroke="${seatStroke}" />
        <path d="M ${x + seatWidth * 0.46} ${floorY - baseHeight} l ${seatWidth * 0.18} ${-seatHeight} q 3 -10 14 -7 l ${seatWidth * 0.18} 4 l ${-seatWidth * 0.23} ${seatHeight + 3} z" fill="${seatFill}" stroke="${seatStroke}" />
        <text x="${x + seatWidth / 2}" y="${Math.max(18, floorY - seatHeight - 14)}" text-anchor="middle" class="seat-label">${t('front')}</text>
      </g>
    `;
  }

  if (view === 'front') {
    const cargoX = padding;
    const cargoY = padding;
    const cargoWidth = projection.width * scale;
    const seatWidth = Math.max(42, cargoWidth * 0.26);
    const seatHeight = Math.min(54, projection.height * scale * 0.28);
    const gap = Math.max(14, cargoWidth * 0.08);
    const startX = cargoX + (cargoWidth - seatWidth * 2 - gap) / 2;
    const y = Math.max(8, cargoY - seatHeight - 8);
    return `
      <g class="seat-outline seat-outline--front" aria-label="${label}">
        <rect x="${startX}" y="${y}" width="${seatWidth}" height="${seatHeight}" rx="11" fill="${seatFill}" stroke="${seatStroke}" />
        <rect x="${startX + seatWidth + gap}" y="${y}" width="${seatWidth}" height="${seatHeight}" rx="11" fill="${seatFill}" stroke="${seatStroke}" />
        <text x="${cargoX + cargoWidth / 2}" y="${Math.max(14, y - 6)}" text-anchor="middle" class="seat-label">${t('front')}</text>
      </g>
    `;
  }

  const cargoX = padding;
  const cargoY = padding;
  const cargoWidth = projection.width * scale;
  const cargoHeight = projection.height * scale;
  const seatDepth = Math.min(76, cargoWidth * 0.18);
  const seatWidth = Math.max(44, cargoHeight * 0.28);
  const gap = Math.max(12, cargoHeight * 0.08);
  const startY = cargoY + (cargoHeight - seatWidth * 2 - gap) / 2;
  const x = cargoX + cargoWidth + 14;
  return `
    <g class="seat-outline seat-outline--top" aria-label="${label}">
      <rect x="${x}" y="${startY}" width="${seatDepth}" height="${seatWidth}" rx="12" fill="${seatFill}" stroke="${seatStroke}" />
      <rect x="${x}" y="${startY + seatWidth + gap}" width="${seatDepth}" height="${seatWidth}" rx="12" fill="${seatFill}" stroke="${seatStroke}" />
      <line x1="${cargoX + cargoWidth}" y1="${cargoY}" x2="${cargoX + cargoWidth}" y2="${cargoY + cargoHeight}" class="seat-back-line" />
      <text x="${x + seatDepth / 2}" y="${Math.max(18, startY - 8)}" text-anchor="middle" class="seat-label">${t('front')}</text>
    </g>
  `;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function shadeColor(hex, percent) {
  const number = Number.parseInt(hex.replace('#', ''), 16);
  const amount = Math.round(2.55 * percent);
  const red = clamp((number >> 16) + amount, 0, 255);
  const green = clamp(((number >> 8) & 0x00ff) + amount, 0, 255);
  const blue = clamp((number & 0x0000ff) + amount, 0, 255);
  return `#${((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).slice(1)}`;
}

function mixWithWhite(hex, ratio = 0.9) {
  const number = Number.parseInt(hex.replace('#', ''), 16);
  const red = (number >> 16) & 0xff;
  const green = (number >> 8) & 0xff;
  const blue = number & 0xff;
  const blend = (channel) => clamp(Math.round(channel * (1 - ratio) + 255 * ratio), 0, 255);
  return `#${((1 << 24) + (blend(red) << 16) + (blend(green) << 8) + blend(blue)).toString(16).slice(1)}`;
}

function renderZoneSvg(zone, placements, index) {
  const projection = projectZone(zone, state.activeView);
  const padding = state.activeView === 'front' ? 82 : 28;
  const seatGutter = state.activeView === 'front' ? 0 : 112;
  const maxSvgWidth = 720;
  const contentWidth = maxSvgWidth - padding * 2 - seatGutter;
  const scale = Math.min(contentWidth / projection.width, 320 / projection.height);
  const svgWidth = Math.max(360, projection.width * scale + padding * 2 + seatGutter);
  const svgHeight = Math.max(220, projection.height * scale + padding * 2 + 34);
  const seatOutline = seatOutlineFor2dView(projection, state.activeView, padding, scale);
  const encroachmentOverlay = seatEncroachmentOverlay(zone, projection, state.activeView, padding, scale);

  const rects = placements.map((placement) => {
    const box = projectBox(placement, state.activeView);
    const x = padding + box.x * scale;
    const y = padding + (projection.height - box.y - box.height) * scale;
    const width = Math.max(4, box.width * scale);
    const height = Math.max(4, box.height * scale);
    return `
      <g>
        <rect class="luggage-rect" x="${x}" y="${y}" width="${width}" height="${height}" rx="7" fill="${colorForPlacement(placement)}" />
        <title>${localizedPlacementLabel(placement)}: ${dimensionsLabel(placement.orientationMm)}</title>
      </g>
    `;
  }).join('');

  return `
    <article class="zone-card">
      <div class="zone-card__header">
        <strong>${localizeEntity(zone, 'label')}</strong>
        <span>${dimensionsLabel(zone.dimensionsMm)} · ${zone.volumeLitres} L</span>
      </div>
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="${t('zoneViewAria').replace('{zone}', localizeEntity(zone, 'label')).replace('{view}', state.activeView)}">
        ${seatOutline}
        <rect class="cargo-outline" x="${padding}" y="${padding}" width="${projection.width * scale}" height="${projection.height * scale}" rx="12" fill="#eff6ff" />
        ${encroachmentOverlay}
        ${rects}
        <text x="${padding}" y="${svgHeight - 12}" class="axis-label">${projection.xLabel}: ${projection.width} mm</text>
        <text x="${svgWidth - padding}" y="${svgHeight - 12}" text-anchor="end" class="axis-label">${projection.yLabel}: ${projection.height} mm</text>
      </svg>
      ${placements.length === 0 ? `<p class="empty-zone">${t('noBagsInZone')}</p>` : ''}
    </article>
  `;
}


function createBoxVertices(position, size) {
  const { x, y, z } = position;
  const { length, width, height } = size;
  return [
    { x, y, z },
    { x: x + length, y, z },
    { x: x + length, y: y + width, z },
    { x, y: y + width, z },
    { x, y, z: z + height },
    { x: x + length, y, z: z + height },
    { x: x + length, y: y + width, z: z + height },
    { x, y: y + width, z: z + height }
  ];
}

function createSeatGuideVertices(zone) {
  const dimensions = zone.dimensionsMm;
  const seatDepth = Math.max(90, dimensions.length * 0.12);
  const seatHeight = Math.min(Math.max(360, dimensions.height * 0.82), dimensions.height + 140);
  const seatWidth = dimensions.width * 0.28;
  const gap = dimensions.width * 0.08;
  const startY = (dimensions.width - seatWidth * 2 - gap) / 2;

  return [0, 1].flatMap((index) => createBoxVertices(
    { x: dimensions.length + seatDepth * 0.15, y: startY + index * (seatWidth + gap), z: 0 },
    { length: seatDepth, width: seatWidth, height: seatHeight }
  ));
}

function createSeatEncroachmentWedgeVertices(zone) {
  if (!hasActiveSeatBackEncroachment([zone]) || !zone.dimensionsMm) return [];
  const dimensions = zone.dimensionsMm;
  const topEncroachment = clamp(seatBackEncroachmentMmAtHeight(zone, dimensions.height), 0, dimensions.length);
  const topX = dimensions.length - topEncroachment;
  return [
    { x: dimensions.length, y: 0, z: 0 },
    { x: dimensions.length, y: 0, z: dimensions.height },
    { x: topX, y: 0, z: dimensions.height },
    { x: dimensions.length, y: dimensions.width, z: 0 },
    { x: dimensions.length, y: dimensions.width, z: dimensions.height },
    { x: topX, y: dimensions.width, z: dimensions.height }
  ];
}

function normalizeYaw(yaw) {
  return ((yaw % 360) + 360) % 360;
}

function displayYawDegrees(yaw) {
  return Math.round(normalizeYaw(yaw)) % 360;
}

function current3dAngles() {
  return {
    yaw: normalizeYaw(state.rotation3d.yaw) * Math.PI / 180,
    pitch: state.rotation3d.pitch * Math.PI / 180
  };
}

function rotatePoint3d(point, center, angles = current3dAngles()) {
  const cosYaw = Math.cos(angles.yaw);
  const sinYaw = Math.sin(angles.yaw);
  const cosPitch = Math.cos(angles.pitch);
  const sinPitch = Math.sin(angles.pitch);
  const centeredX = point.x - center.x;
  const centeredY = point.y - center.y;
  const centeredZ = point.z - center.z;
  const rotatedX = centeredX * cosYaw - centeredY * sinYaw;
  const rotatedY = centeredX * sinYaw + centeredY * cosYaw;

  return {
    x: rotatedX,
    y: rotatedY * cosPitch - centeredZ * sinPitch,
    depth: rotatedY * sinPitch + centeredZ * cosPitch
  };
}

function createProjector(zone, placements, canvasWidth, canvasHeight, padding, extraPoints = []) {
  const dimensions = zone.dimensionsMm;
  const center = { x: dimensions.length / 2, y: dimensions.width / 2, z: dimensions.height / 2 };
  const allPoints = [
    ...createBoxVertices({ x: 0, y: 0, z: 0 }, dimensions),
    ...placements.flatMap((placement) => createBoxVertices(placement.positionMm, placement.orientationMm)),
    ...extraPoints
  ];
  const raw = (point) => rotatePoint3d(point, center);
  const maxRadius = Math.max(...allPoints.map((point) => {
    const centeredX = point.x - center.x;
    const centeredY = point.y - center.y;
    const centeredZ = point.z - center.z;
    return Math.hypot(centeredX, centeredY, centeredZ);
  }), 1);
  const scale = Math.min((canvasWidth - padding * 2) / (maxRadius * 2), (canvasHeight - padding * 2) / (maxRadius * 2));
  return (point) => {
    const output = raw(point);
    return {
      x: canvasWidth / 2 + output.x * scale,
      y: canvasHeight / 2 + output.y * scale,
      depth: output.depth
    };
  };
}

function polygonPoints(points) {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}

function renderFace(vertices, indices, fill, className, title = '') {
  const points = indices.map((faceIndex) => vertices[faceIndex]);
  const depth = points.reduce((total, point) => total + point.depth, 0) / points.length;
  return {
    depth,
    markup: `<polygon class="${className}" points="${polygonPoints(points)}" fill="${fill}">${title ? `<title>${title}</title>` : ''}</polygon>`
  };
}

function orientationPresets() {
  return {
    x: { label: t('bootView'), yaw: 270, pitch: 90 },
    y: { label: t('sideView'), yaw: 0, pitch: 90 },
    z: { label: t('topView'), yaw: -90, pitch: 0 }
  };
}

function renderOrientationAxisControl() {
  const origin = { x: 710, y: 104 };
  const axisLength = 44;
  const center = { x: 0, y: 0, z: 0 };
  const axes = [
    { key: 'x', label: 'X', color: '#dc2626', vector: { x: axisLength, y: 0, z: 0 }, title: t('bootView') },
    { key: 'y', label: 'Y', color: '#16a34a', vector: { x: 0, y: axisLength, z: 0 }, title: t('sideView') },
    { key: 'z', label: 'Z', color: '#2563eb', vector: { x: 0, y: 0, z: axisLength }, title: t('topView') }
  ];

  const axisMarkup = axes.map((axis) => {
    const endpoint = rotatePoint3d(axis.vector, center);
    const x = origin.x + endpoint.x;
    const y = origin.y + endpoint.y;
    const labelX = origin.x + endpoint.x * 1.18;
    const labelY = origin.y + endpoint.y * 1.18;

    return `
      <g class="orientation-axis-button" role="button" tabindex="0" data-axis="${axis.key}" aria-label="${t('switchTo').replace('{view}', axis.title)}" style="--axis-color:${axis.color}">
        <line class="orientation-axis-line" x1="${origin.x}" y1="${origin.y}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" />
        <circle class="orientation-axis-end" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" />
        <text class="orientation-axis-label" x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" dominant-baseline="middle">${axis.label}</text>
        <title>${t('axisTitle').replace('{axis}', axis.label).replace('{view}', axis.title)}</title>
      </g>
    `;
  }).join('');

  const orientationStatus = state.activeOrientationLabel
    ? `<text class="orientation-axis-preset-label" x="722" y="172" text-anchor="middle">${state.activeOrientationLabel}</text>`
    : `<text class="orientation-axis-angle-label" x="722" y="156" text-anchor="middle">
        <tspan x="722">${t('yawLabel')} ${displayYawDegrees(state.rotation3d.yaw)}°</tspan>
        <tspan x="722" dy="16">${t('pitchLabel')} ${Math.round(state.rotation3d.pitch)}°</tspan>
      </text>`;

  return `
    <g class="orientation-axis-control" aria-label="${t('orientationAxisControl')}">
      <rect class="orientation-axis-panel" x="648" y="18" width="148" height="184" rx="16" />
      <text class="orientation-axis-heading" x="722" y="40" text-anchor="middle">${t('orientation').toLowerCase()}</text>
      ${axisMarkup}
      ${orientationStatus}
    </g>
  `;
}

function set3dOrientation(axis) {
  const preset = orientationPresets()[axis];
  if (!preset) return;
  state.rotation3d = { yaw: normalizeYaw(preset.yaw), pitch: preset.pitch };
  state.activeOrientationLabel = preset.label;
  renderResults();
}

function renderSeatEncroachmentWedge3d(zone, project) {
  const rawVertices = createSeatEncroachmentWedgeVertices(zone);
  if (rawVertices.length === 0) return [];
  const vertices = rawVertices.map(project);
  const title = t('seatWedgeTitle').replace('{angle}', String(seatBackAngleDegrees(zone)));
  return [
    renderFace(vertices, [0, 1, 2], '#fecaca', 'seat-encroachment-face', title),
    renderFace(vertices, [3, 5, 4], '#fecaca', 'seat-encroachment-face', title),
    renderFace(vertices, [1, 4, 5, 2], '#fee2e2', 'seat-encroachment-face', title),
    renderFace(vertices, [0, 3, 4, 1], '#fecaca', 'seat-encroachment-face', title),
    renderFace(vertices, [0, 2, 5, 3], '#fee2e2', 'seat-encroachment-face', title)
  ];
}

function renderSeatGuide3d(zone, project) {
  const dimensions = zone.dimensionsMm;
  const seatDepth = Math.max(90, dimensions.length * 0.12);
  const seatHeight = Math.min(Math.max(360, dimensions.height * 0.82), dimensions.height + 140);
  const seatWidth = dimensions.width * 0.28;
  const gap = dimensions.width * 0.08;
  const startY = (dimensions.width - seatWidth * 2 - gap) / 2;

  return [0, 1].flatMap((index) => {
    const vertices = createBoxVertices(
      { x: dimensions.length + seatDepth * 0.15, y: startY + index * (seatWidth + gap), z: 0 },
      { length: seatDepth, width: seatWidth, height: seatHeight }
    ).map(project);

    return [
      renderFace(vertices, [0, 1, 2, 3], '#fde68a', 'seat-face', t('seatGuideTitle')),
      renderFace(vertices, [3, 0, 4, 7], '#fef3c7', 'seat-face', t('seatGuideTitle')),
      renderFace(vertices, [4, 5, 6, 7], '#fef3c7', 'seat-face', t('seatGuideTitle'))
    ];
  });
}

function renderZone3dSvg(zone, placements) {
  const svgWidth = 820;
  const svgHeight = 440;
  const padding = 34;
  const seatGuidePoints = createSeatGuideVertices(zone);
  const seatEncroachmentWedgePoints = createSeatEncroachmentWedgeVertices(zone);
  const project = createProjector(zone, placements, svgWidth, svgHeight, padding, [...seatGuidePoints, ...seatEncroachmentWedgePoints]);
  const zoneVertices = createBoxVertices({ x: 0, y: 0, z: 0 }, zone.dimensionsMm).map(project);
  const faces = [
    ...renderSeatGuide3d(zone, project),
    ...renderSeatEncroachmentWedge3d(zone, project),
    renderFace(zoneVertices, [0, 1, 2, 3], '#dbeafe', 'zone-face zone-face--floor'),
    ...placements.flatMap((placement) => {
      const color = colorForPlacement(placement);
      const vertices = createBoxVertices(placement.positionMm, placement.orientationMm).map(project);
      const title = `${localizedPlacementLabel(placement)}: ${dimensionsLabel(placement.orientationMm)}`;
      return [
        renderFace(vertices, [0, 1, 2, 3], shadeColor(color, -18), 'bag-face', title),
        renderFace(vertices, [0, 1, 5, 4], shadeColor(color, -8), 'bag-face', title),
        renderFace(vertices, [1, 2, 6, 5], shadeColor(color, -14), 'bag-face', title),
        renderFace(vertices, [2, 3, 7, 6], shadeColor(color, 2), 'bag-face', title),
        renderFace(vertices, [3, 0, 4, 7], shadeColor(color, -22), 'bag-face', title),
        renderFace(vertices, [4, 5, 6, 7], shadeColor(color, 12), 'bag-face', title)
      ];
    })
  ].sort((a, b) => a.depth - b.depth).map((face) => face.markup).join('');

  return `
    <article class="zone-card zone-card--3d">
      <div class="zone-card__header">
        <div>
          <strong>${localizeEntity(zone, 'label')}</strong>
          <span>${dimensionsLabel(zone.dimensionsMm)} · ${zone.volumeLitres} L</span>
        </div>
        <span>${t('dragHint')}</span>
      </div>
      <svg class="zone-3d-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="${localizeEntity(zone, 'label')} ${t('zone3dAria')}">
        <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" rx="18" fill="#f8fafc" />
        ${faces}
        <polyline class="zone-wire" points="${polygonPoints([zoneVertices[0], zoneVertices[1], zoneVertices[2], zoneVertices[3], zoneVertices[0]])}" />
        <line class="zone-wire" x1="${zoneVertices[0].x}" y1="${zoneVertices[0].y}" x2="${zoneVertices[4].x}" y2="${zoneVertices[4].y}" />
        <line class="zone-wire" x1="${zoneVertices[1].x}" y1="${zoneVertices[1].y}" x2="${zoneVertices[5].x}" y2="${zoneVertices[5].y}" />
        <line class="zone-wire" x1="${zoneVertices[2].x}" y1="${zoneVertices[2].y}" x2="${zoneVertices[6].x}" y2="${zoneVertices[6].y}" />
        <line class="zone-wire" x1="${zoneVertices[3].x}" y1="${zoneVertices[3].y}" x2="${zoneVertices[7].x}" y2="${zoneVertices[7].y}" />
        <polyline class="zone-wire" points="${polygonPoints([zoneVertices[4], zoneVertices[5], zoneVertices[6], zoneVertices[7], zoneVertices[4]])}" />
        ${renderOrientationAxisControl()}
      </svg>
      ${placements.length === 0 ? `<p class="empty-zone">${t('noBagsInZone')}</p>` : ''}
    </article>
  `;
}

function renderVisualization(vehicle, config, result) {
  const zones = config.cargoZoneIds.map((id) => vehicle.cargoZones.find((zone) => zone.id === id)).filter(Boolean);
  setSanitizedMarkup(visualization, zones.map((zone, index) => {
    const placements = result.placements.filter((placement) => placement.zoneId === zone.id);
    return state.activeView === '3d' ? renderZone3dSvg(zone, placements) : renderZoneSvg(zone, placements, index);
  }).join(''));
  bind3dRotation();
}

function bind3dRotation() {
  if (state.activeView !== '3d') return;
  visualization.querySelectorAll('.zone-3d-svg').forEach((svg) => {
    svg.querySelectorAll('.orientation-axis-button').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        set3dOrientation(button.dataset.axis);
      });
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        set3dOrientation(button.dataset.axis);
      });
    });

    svg.addEventListener('pointerdown', (event) => {
      if (event.target.closest('.orientation-axis-control')) return;
      event.preventDefault();
      let previous = { x: event.clientX, y: event.clientY };
      svg.classList.add('is-dragging');

      const handleMove = (moveEvent) => {
        const dx = moveEvent.clientX - previous.x;
        const dy = moveEvent.clientY - previous.y;
        previous = { x: moveEvent.clientX, y: moveEvent.clientY };
        state.rotation3d.yaw = normalizeYaw(state.rotation3d.yaw - dx * 0.35);
        state.rotation3d.pitch = clamp(state.rotation3d.pitch - dy * 0.25, 0, 90);
        if (dx || dy) state.activeOrientationLabel = '';
        renderResults();
      };
      const endDrag = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', endDrag);
        window.removeEventListener('pointercancel', endDrag);
        visualization.querySelectorAll('.zone-3d-svg').forEach((currentSvg) => currentSvg.classList.remove('is-dragging'));
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', endDrag, { once: true });
      window.addEventListener('pointercancel', endDrag, { once: true });
    });
  });
}

function renderLists(result) {
  const placedList = $('#placedList');
  if (result.placements.length) {
    placedList.replaceChildren(...result.placements.map((placement) => {
      const sourceId = placement.sourceId ?? placement.itemId.split('#')[0];
      const tint = colorForSourceId(sourceId);
      const li = createEl('li', { className: 'placed-item', attrs: { 'data-source-id': sourceId } });
      li.append(
        createEl('span', { className: 'item-status item-status--placed', text: '✓', attrs: { 'aria-hidden': 'true' } }),
        createEl('button', { className: 'placed-delete', text: '✕', attrs: { type: 'button', title: t('removeOne').replace('{item}', localizedPlacementLabel(placement)), 'aria-label': t('removeOne').replace('{item}', localizedPlacementLabel(placement)) } }),
        createEl('strong', { text: localizedPlacementLabel(placement) }),
        createEl('small', { text: `${localizedZoneLabel(placement.zoneLabel, placement.zoneId)} · ${dimensionsLabel(placement.orientationMm)}` })
      );
      li.style.setProperty('--bag-panel-bg', mixWithWhite(tint, 0.9));
      return li;
    }));
  } else {
    placedList.replaceChildren(createEl('li', { className: 'muted', text: t('nothingPlacedYet') }));
  }

  const unplacedList = $('#unplacedList');
  if (result.unplacedItems.length) {
    unplacedList.replaceChildren(...result.unplacedItems.map((item) => {
      const sourceId = item.sourceId ?? item.id?.split('#')[0] ?? item.id;
      const tint = colorForSourceId(sourceId);
      const li = createEl('li', { className: 'problem placed-item', attrs: { 'data-source-id': sourceId } });
      li.append(
        createEl('span', { className: 'item-status item-status--unplaced', text: '⊘', attrs: { 'aria-hidden': 'true' } }),
        createEl('button', { className: 'placed-delete', text: '✕', attrs: { type: 'button', title: t('removeOne').replace('{item}', localizedPlacementLabel(item)), 'aria-label': t('removeOne').replace('{item}', localizedPlacementLabel(item)) } }),
        createEl('strong', { text: localizedPlacementLabel(item) }),
        createEl('small', { text: `${dimensionsLabel(item.dimensionsMm)} · ${item.volumeLitres} L` })
      );
      li.style.setProperty('--bag-panel-bg', mixWithWhite(tint, 0.9));
      return li;
    }));
  } else {
    unplacedList.replaceChildren(createEl('li', { className: 'success', text: t('allPlaced') }));
  }
}

function renderResults() {
  const vehicle = selectedVehicle();
  const config = selectedConfiguration(vehicle);
  const zones = config.cargoZoneIds.map((id) => vehicle.cargoZones.find((zone) => zone.id === id)).filter(Boolean);
  const luggageSet = cloneLuggageWithQuantities();
  const result = estimateFit(luggageSet, vehicle, config.id, {
    considerSeatBackEncroachment: hasActiveSeatBackEncroachment(zones),
    seatBackAngleDegrees: state.seatBackEncroachmentAngleDegrees
  });
  const percent = Math.round(result.fitScore * 100);
  const volumePercent = Math.round((result.usedVolumeLitres / Math.max(1, result.usableVolumeLitres)) * 100);

  const fitResultLabel = t('placedCount').replace('{placed}', String(result.placements.length)).replace('{unplaced}', String(result.unplacedItems.length));
  const fitResultDetail = t('volumeUsedPercent').replace('{percent}', String(volumePercent));

  $('#resultTitle').textContent = `${vehicle.make} ${vehicle.model} · ${localizeEntity(config, 'label')}`;
  $('#fitBadge').className = `fit-badge ${result.fits ? 'fit-badge--ok' : 'fit-badge--bad'}`;
  $('#fitBadge').textContent = result.fits ? t('bagsFit') : t('bagsUnplaced');
  $('#metrics').replaceChildren(...[
    metricCard(t('fitScore'), `${percent}%`, t('placedSummary').replace('{placed}', String(result.placements.length)).replace('{total}', String(result.placements.length + result.unplacedItems.length))),
    metricCard(t('usableVolume'), `${result.usableVolumeLitres} L`, t('usedVolume').replace('{used}', String(result.usedVolumeLitres))),
    metricCard(t('fitResult'), fitResultLabel, fitResultDetail, 'metric--fit-result')
  ]);
  renderVisualization(vehicle, config, result);
  renderLists(result);
  $('#warnings').replaceChildren();
}

function bindEvents() {
  vehicleSelect.addEventListener('change', () => {
    state.vehicleId = vehicleSelect.value;
    renderConfigurationOptions();
    syncSeatBackEncroachmentDefault();
    renderSeatBackEncroachmentState();
    renderResults();
  });
  configurationSelect.addEventListener('change', () => {
    state.configurationId = configurationSelect.value;
    syncSeatBackEncroachmentDefault();
    renderSeatBackEncroachmentState();
    renderResults();
  });
  seatBackEncroachmentDegreesInput.addEventListener('input', () => {
    state.seatBackEncroachmentAngleDegrees = clamp(Number(seatBackEncroachmentDegreesInput.value) || 0, 0, 89);
    seatBackEncroachmentDegreesInput.value = state.seatBackEncroachmentAngleDegrees;
    renderResults();
  });
  resetLuggageButton.addEventListener('click', resetLuggageQuantities);
  document.querySelectorAll('.view-tab').forEach((button) => button.addEventListener('click', () => {
    state.activeView = button.dataset.view;
    document.querySelectorAll('.view-tab').forEach((tab) => tab.classList.toggle('active', tab === button));
    renderResults();
  }));
  $('#placedList').addEventListener('click', (event) => {
    const deleteButton = event.target.closest('.placed-delete');
    if (!deleteButton) return;
    const row = deleteButton.closest('.placed-item');
    const sourceId = row?.dataset.sourceId;
    if (!sourceId) return;
    const quantityInput = $(`#qty-${sourceId}`);
    if (!quantityInput) return;
    const current = Math.max(0, Number(quantityInput.value) || 0);
    quantityInput.value = String(Math.max(0, current - 1));
    renderResults();
  });
  $('#unplacedList').addEventListener('click', (event) => {
    const deleteButton = event.target.closest('.placed-delete');
    if (!deleteButton) return;
    const row = deleteButton.closest('.placed-item');
    const sourceId = row?.dataset.sourceId;
    if (!sourceId) return;
    const quantityInput = $(`#qty-${sourceId}`);
    if (!quantityInput) return;
    const current = Math.max(0, Number(quantityInput.value) || 0);
    quantityInput.value = String(Math.max(0, current - 1));
    renderResults();
  });
  $('#languageSelect').addEventListener('change', (event) => {
    setLanguage(event.target.value);
  });
}

function applyStaticTranslations() {
  document.title = t('pageTitle');
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    const key = el.dataset.i18nAriaLabel;
    el.setAttribute('aria-label', t(key));
  });
}

function setLanguage(language) {
  state.language = language;
  document.documentElement.lang = language;
  const languageSelect = $('#languageSelect');
  if (languageSelect && languageSelect.value !== language) {
    languageSelect.value = language;
  }
  persistLanguagePreference(language);
  applyStaticTranslations();
  renderVehicleOptions();
  renderConfigurationOptions();
  renderLuggageControls();
  renderResults();
}

function persistLanguagePreference(language) {
  if (typeof document === 'undefined') return;
  if (language === 'en') {
    document.cookie = `${LANGUAGE_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `${LANGUAGE_COOKIE_NAME}=${encodeURIComponent(language)}; path=/; max-age=${LANGUAGE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function getPersistedLanguagePreference() {
  if (typeof document === 'undefined') return null;
  const languageCookie = document.cookie
    .split(';')
    .map((segment) => segment.trim())
    .find((segment) => segment.startsWith(`${LANGUAGE_COOKIE_NAME}=`));
  if (!languageCookie) return null;
  const cookieLanguage = decodeURIComponent(languageCookie.split('=').slice(1).join('='));
  return I18N[cookieLanguage] ? cookieLanguage : null;
}

export async function initApp() {
  try {
    const [luggageSet, vehicles] = await Promise.all([
      readJson('./configs/luggage/common.json'),
      loadVehicles()
    ]);
    state.luggageSet = luggageSet;
    state.vehicles = vehicles.sort((a, b) => vehicleLabel(a).localeCompare(vehicleLabel(b)));
    const initialVehicle = defaultVehicle();
    state.vehicleId = initialVehicle.id;
    state.configurationId = initialVehicle.seatConfigurations[0].id;
    syncSeatBackEncroachmentDefault();
    renderVehicleOptions();
    renderConfigurationOptions();
    renderSeatBackEncroachmentState();
    renderLuggageControls();
    bindEvents();
    const persistedLanguage = getPersistedLanguagePreference();
    if (persistedLanguage && persistedLanguage !== state.language) {
      setLanguage(persistedLanguage);
      return;
    }
    applyStaticTranslations();
    renderResults();
  } catch (error) {
    $('#metrics').replaceChildren(metricCard(t('fitResult'), t('loadErrorTitle'), error.message, 'metric--fit-result'));
    console.error(error);
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initApp().catch((error) => {
    console.error('Failed to initialize app', error);
  });
}
