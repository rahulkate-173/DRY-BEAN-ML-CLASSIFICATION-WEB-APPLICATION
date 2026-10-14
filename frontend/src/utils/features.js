/**
 * Feature metadata — display labels, units, descriptions, and groupings.
 * Maps exact backend field names to UI-friendly information.
 */

export const FEATURE_METADATA = {
  Area: {
    label: 'Area',
    unit: 'pixels²',
    description: 'Total number of pixels within the bean boundary',
    group: 'Size',
  },
  Perimeter: {
    label: 'Perimeter',
    unit: 'pixels',
    description: 'Total boundary length of the bean silhouette',
    group: 'Size',
  },
  MajorAxisLength: {
    label: 'Major Axis Length',
    unit: 'pixels',
    description: 'Length of the longest line fitting inside the bean ellipse',
    group: 'Size',
  },
  MinorAxisLength: {
    label: 'Minor Axis Length',
    unit: 'pixels',
    description: 'Length of the shortest line fitting inside the bean ellipse',
    group: 'Size',
  },
  AspectRation: {
    label: 'Aspect Ratio',
    unit: 'ratio',
    description: 'Major axis length divided by minor axis length',
    group: 'Shape',
  },
  Eccentricity: {
    label: 'Eccentricity',
    unit: 'ratio',
    description: 'Eccentricity of the ellipse with the same moments as the bean (0=circle, 1=line)',
    group: 'Shape',
  },
  ConvexArea: {
    label: 'Convex Area',
    unit: 'pixels²',
    description: 'Area of the smallest convex polygon enclosing the bean',
    group: 'Size',
  },
  EquivDiameter: {
    label: 'Equivalent Diameter',
    unit: 'pixels',
    description: 'Diameter of a circle with the same area as the bean',
    group: 'Size',
  },
  Extent: {
    label: 'Extent',
    unit: 'ratio',
    description: 'Ratio of bean area to bounding rectangle area',
    group: 'Shape',
  },
  Solidity: {
    label: 'Solidity',
    unit: 'ratio',
    description: 'Ratio of bean area to convex hull area (measures surface roughness)',
    group: 'Shape',
  },
  roundness: {
    label: 'Roundness',
    unit: 'ratio',
    description: '4π × area / perimeter² (1.0 is a perfect circle)',
    group: 'Shape',
  },
  Compactness: {
    label: 'Compactness',
    unit: 'ratio',
    description: '√(4π × area) / major axis length',
    group: 'Shape',
  },
  ShapeFactor1: {
    label: 'Shape Factor 1',
    unit: 'index',
    description: 'Major axis length divided by bean area',
    group: 'Shape Factors',
  },
  ShapeFactor2: {
    label: 'Shape Factor 2',
    unit: 'index',
    description: 'Minor axis length divided by bean area',
    group: 'Shape Factors',
  },
  ShapeFactor3: {
    label: 'Shape Factor 3',
    unit: 'index',
    description: 'Ratio related to bean roundness and geometry (Compactness²)',
    group: 'Shape Factors',
  },
  ShapeFactor4: {
    label: 'Shape Factor 4',
    unit: 'index',
    description: 'Shape factor describing bean convexity properties',
    group: 'Shape Factors',
  },
}

export const FEATURE_GROUPS = {
  Size: ['Area', 'Perimeter', 'MajorAxisLength', 'MinorAxisLength', 'ConvexArea', 'EquivDiameter'],
  Shape: ['AspectRation', 'Eccentricity', 'Extent', 'Solidity', 'roundness', 'Compactness'],
  'Shape Factors': ['ShapeFactor1', 'ShapeFactor2', 'ShapeFactor3', 'ShapeFactor4'],
}

export const FEATURE_NAMES = Object.keys(FEATURE_METADATA)

export const BEAN_CLASSES = ['BARBUNYA', 'BOMBAY', 'CALI', 'DERMASON', 'HOROZ', 'SEKER', 'SIRA']

export const BEAN_CLASS_COLORS = {
  BARBUNYA: '#166534',
  BOMBAY:   '#15803d',
  CALI:     '#16a34a',
  DERMASON: '#4ade80',
  HOROZ:    '#86efac',
  SEKER:    '#518a58',
  SIRA:     '#3d6e44',
}

export const BEAN_CLASS_LABELS = {
  BARBUNYA: 'Barbunya',
  BOMBAY:   'Bombay',
  CALI:     'Cali',
  DERMASON: 'Dermason',
  HOROZ:    'Horoz',
  SEKER:    'Seker',
  SIRA:     'Sira',
}

export function getFeatureLabel(key) {
  return FEATURE_METADATA[key]?.label || key
}

export function formatValue(value, key) {
  if (value === null || value === undefined) return '—'
  const meta = FEATURE_METADATA[key]
  if (!meta) return value.toLocaleString(undefined, { maximumFractionDigits: 4 })
  if (meta.group === 'Size') {
    return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 })
}
