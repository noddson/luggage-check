/**
 * @typedef {'box'|'soft_box'|'ellipsoid'|'cylinder'|'free_form'} LuggageShapeType
 * @typedef {'manufacturer'|'rental-company'|'rental-broker'|'standard-body'|'luggage-brand'|'editorial'} SourceType
 * @typedef {'high'|'medium'|'low'} Confidence
 *
 * @typedef {Object} DimensionsMm
 * @property {number} length
 * @property {number} width
 * @property {number} height
 *
 * @typedef {Object} SourceReference
 * @property {SourceType} sourceType
 * @property {string} publisher
 * @property {string} title
 * @property {string} url
 * @property {string} retrievedAt
 * @property {string[]} fieldsCovered
 * @property {Confidence} confidence
 * @property {string=} notes
 *
 * @typedef {Object} LuggageItem
 * @property {string} id
 * @property {string} label
 * @property {number} quantity
 * @property {LuggageShapeType} shapeType
 * @property {DimensionsMm} dimensionsMm
 * @property {number=} compressibility
 * @property {boolean|string[]=} rotationAllowed
 * @property {number=} weightKg
 * @property {{label:string, dimensionsMm: DimensionsMm, offsetMm?: {x:number,y:number,z:number}}[]=} boundingBoxes
 * @property {SourceReference[]} sources
 *
 * @typedef {Object} CargoZone
 * @property {string} id
 * @property {string} label
 * @property {number} volumeLitres
 * @property {DimensionsMm=} dimensionsMm
 * @property {{width:number,height:number}=} openingMm
 * @property {number=} usableFraction
 * @property {'high'|'medium'|'low'} confidence
 * @property {string=} notes
 *
 * @typedef {Object} VehicleConfig
 * @property {string} id
 * @property {string} make
 * @property {string} model
 * @property {string} generation
 * @property {string[]} modelYears
 * @property {string} bodyStyle
 * @property {string[]} rentalClasses
 * @property {string[]} commonRentalAliases
 * @property {CargoZone[]} cargoZones
 * @property {{id:string,label:string,cargoZoneIds:string[],seatsAvailable:number,notes?:string}[]} seatConfigurations
 * @property {SourceReference[]} sources
 */
export const unit = {};
