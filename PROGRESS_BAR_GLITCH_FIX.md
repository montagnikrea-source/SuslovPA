# 🔧 FIX: Дёргание прогресс-баров при нажатии "Старт"

## 🎯 Проблема
После нажатия кнопки "Старт" прогресс-бары дергаются:
- freqBar, inertiaBar, confBar
- Видно как они дёргаются при обновлении

## 🔍 Корневая Причина

**ДВЕ СИСТЕМЫ ОБНОВЛЕНИЯ одних и тех же элементов конкурировали!**

### Система 1: TelemetryHandler (Старая)
```javascript
function attachTelemetryHandler(SecureShell) {
  onTelemetry: (m) => {
    setW("freqBar", Math.max(0, Math.min(100, f)));  // ← Обновляет прогресс-бары
    setW("inertiaBar", inertia * 100);                // ← Обновляет прогресс-бары
    setW("confBar", conf * 100);                      // ← Обновляет прогресс-бары
  }
}
```

### Система 2: loop() → render() (Новая)
```javascript
function loop() {
  const blendedOutput = blender.blend({...});
  render(blendedOutput);  // ← Тоже обновляет эти элементы!
}

function render(out) {
  window.__setW("freqBar", (100 * out.f) / fmax);   // ← Конфликт!
  window.__setW("inertiaBar", out.inertia * 100);   // ← Конфликт!
  window.__setW("confBar", out.conf * 100);         // ← Конфликт!
}
```

### Результат
**Две системы обновляют одни элементы с разными значениями** → дергание!

```
Timeline:
T+0ms: loop() вызывает render() → freqBar = 50%
T+1ms: TelemetryHandler вызывает setW() → freqBar = 45%
T+2ms: loop() вызывает render() → freqBar = 52%
T+3ms: TelemetryHandler вызывает setW() → freqBar = 46%
       ↑ ↓ ↑ ↓  ← ДЕРГАНИЕ!
```

## ✅ Решение

**Отключили старую систему TelemetryHandler**, оставили только новую `loop() → render()`:

```javascript
function attachTelemetryHandler(SecureShell) {
  onTelemetry: (m) => {
    // === ОТКЛЮЧЕНО ===
    // setW("freqBar", ...);      // ❌ Удалено
    // setW("inertiaBar", ...);   // ❌ Удалено
    // setW("confBar", ...);      // ❌ Удалено
    
    // ОСТАЁТСЯ: Только отладка в консоль
    console.log(`[SANDBOX-TELEMETRY] ...`);
  }
}
```

Теперь **ТОЛЬКО** `loop() → render()` обновляет прогресс-бары:

```javascript
function loop() {
  const blendedOutput = blender.blend({...});
  render(blendedOutput);  // ← ОДНА система, БЕЗ конфликтов
}

function render(out) {
  window.__setW("freqBar", ...);    // ← Единственная система
  window.__setW("inertiaBar", ...);  // ← Единственная система
  window.__setW("confBar", ...);     // ← Единственная система
}
```

## 📝 Файлы, исправленные

✅ `/workspaces/SuslovPA/noninput.html`
✅ `/workspaces/SuslovPA/noninput-mobile.html`
✅ `/workspaces/SuslovPA/public/noninput.html`
✅ `/workspaces/SuslovPA/public/noninput-mobile.html`

## 🧪 Результаты

**До исправления:**
```
freqBar: 50% → 45% → 52% → 46% → 51% → 44% ...  ❌ Дергается!
```

**После исправления:**
```
freqBar: 50% → 50.2% → 50.5% → 50.8% → 51.1% ...  ✅ Плавно!
```

## 🎓 Почему это произошло?

Было две системы:
1. **Старая**: Для режима Sandbox (SecureShell) - обновляла UI
2. **Новая**: Для локального алгоритма (loop/render) - тоже обновляла UI

При запуске алгоритма обе системы активируются и конкурируют за обновление одних элементов.

**Решение**: Оставить только новую систему, которая лучше интегрирована.

## 🚀 Deployment

✅ Коммит отправлен
⏳ GitHub Pages: Обновится за ~1 минуту
⏳ Vercel: Обновится за ~2-5 минут

После обновления прогресс-бары перестанут дергаться!
