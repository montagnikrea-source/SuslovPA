# Progress Bars Logic Documentation

## Overview
All progress bars display values from 0-100%. This document explains the logic behind each bar.

---

## 1. Frequency Bar (Частота)

### Purpose
Shows the detected CPU frequency relative to its peak value

### Input Value
- `out.f`: Raw frequency in Hz (0-200 Hz typical range)

### Calculation
```javascript
// Track peak frequency across session
if (out.f > window.__peakFrequency) {
  window.__peakFrequency = out.f;
}

// Calculate display scale with 10% headroom
fmax = Math.max(50, window.__peakFrequency * 1.1);  // Add 10% buffer
fmax = Math.min(200, fmax);                         // Cap at 200 Hz

// Calculate bar percentage
barPercent = (100 * freq) / fmax;
barPercent = Math.min(100, Math.max(0, barPercent)); // Clamp to 0-100%
```

### Behavior
- Starts at 0% when algorithm initializes
- Fills proportionally as frequency increases
- When frequency reaches peak, bar ≈ 91% (because of 10% headroom)
- When frequency exceeds peak, bar maxes at 100%

### Example
| Scenario | Peak | Current | fmax | Bar % |
|----------|------|---------|------|-------|
| Initial | 0 | 0 | 50 | 0% |
| Growing | 50 | 50 | 55 | 91% |
| Peak reached | 100 | 100 | 110 | 91% |
| Beyond peak | 100 | 110 | 110 | 100% |

---

## 2. Stability Bar (Стабильность)

### Purpose
Shows how stable/consistent the frequency measurement is

### Input Value
- `out.inertia`: Stability coefficient (0.0 - 1.0)
  - 0.0 = Very unstable, frequency estimate changing rapidly
  - 1.0 = Very stable, frequency estimate is steady

### Calculation
```javascript
// Direct percentage conversion
inertiaPercent = out.inertia * 100;     // 0-1 → 0-100%
inertiaPercent = Math.min(100, Math.max(0, inertiaPercent)); // Clamp

window.__setW("inertiaBar", inertiaPercent);
```

### Behavior
- Linear transformation from 0-1 to 0-100%
- Higher stability = Higher bar
- Low values (0-20%) indicate noisy/unstable conditions
- High values (80-100%) indicate clean/stable conditions

### Example
| Stability | Bar % |
|-----------|-------|
| 0.0 | 0% |
| 0.2 | 20% (noisy) |
| 0.5 | 50% (moderate) |
| 0.8 | 80% (good) |
| 1.0 | 100% (excellent) |

---

## 3. Confidence Bar (Уверенность)

### Purpose
Shows algorithm's confidence in the frequency measurement

### Input Value
- `out.conf`: Confidence coefficient (0.0 - 1.0)
  - 0.0 = Low confidence, measurement may be unreliable
  - 1.0 = High confidence, measurement is reliable

### Calculation
```javascript
// Direct percentage conversion
confPercent = out.conf * 100;           // 0-1 → 0-100%
confPercent = Math.min(100, Math.max(0, confPercent)); // Clamp

window.__setW("confBar", confPercent);
```

### Behavior
- Linear transformation from 0-1 to 0-100%
- Higher confidence = Higher bar
- Used to indicate measurement reliability
- Typically correlates with inertia but independent metric

### Example
| Confidence | Bar % |
|-----------|-------|
| 0.0 | 0% |
| 0.2 | 20% (low confidence) |
| 0.5 | 50% (moderate confidence) |
| 0.8 | 80% (good confidence) |
| 1.0 | 100% (full confidence) |

---

## Safety Guards

All bars have protection against invalid values:

```javascript
// Prevent NaN/Infinity issues
barPercent = Math.min(100, Math.max(0, calculatedValue));
```

This ensures:
- No negative percentages
- No values above 100%
- NaN values clamped to 0%
- Infinity values clamped to 100%

---

## Display Format

### Text Values
```javascript
// Frequency
"100.000 (fmax=110)" // Shows value and scale

// Inertia / Confidence
"91"                 // Shows percentage (0-100)
```

### Bar Fill
```javascript
// All bars use CSS width percentage
element.style.width = barPercent + "%";
```

---

## Relationship Between Bars

### Typical Patterns

**Initialization Phase (first few seconds):**
- Frequency: 0% → gradually increases
- Stability: Low (20-40%) - algorithm still learning
- Confidence: Low (10-30%) - insufficient data

**Stable Operation:**
- Frequency: ≈91% (at peak, with headroom)
- Stability: High (70-95%) - consistent measurements
- Confidence: High (60-90%) - reliable data

**CPU Jitter/Noise:**
- Frequency: Fluctuates
- Stability: Drops (40-60%)
- Confidence: Drops (30-50%)

---

## Version Info

- Last Updated: November 1, 2025
- Applied to: All 4 HTML files (noninput.html, noninput-mobile.html, public/noninput.html, public/noninput-mobile.html)
- Commit: 816b60d+
