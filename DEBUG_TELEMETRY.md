# 🧪 ИНСТРУКЦИЯ ОТЛАДКИ ТЕЛЕМЕТРИИ

## Шаг 1: Откройте сайт в браузере

**Vercel:** https://suslovpa.vercel.app
**GitHub Pages:** https://montagnikrea-source.github.io/SuslovPA

## Шаг 2: Откройте консоль браузера

1. Нажмите **F12** (или Cmd+Option+J на Mac)
2. Перейдите на вкладку **Console**
3. Очистите консоль (Cmd+K / Ctrl+L)

## Шаг 3: Нажмите кнопку "СТАРТ"

Когда вы нажмете кнопку запуска, вы должны увидеть в консоли:

### Если все работает правильно:

```
[LOOP 1] Starting, scan= object , setT= function
[RENDER 1] out= {f: 2.345, conf: 0.78, inertia: 0.45, state: "..."}
[SET-T] #freqValue = "2.345"
[SET-W] #freqBar = 23%
[SET-T] #confValue = "78"
[SET-W] #confBar = 78%
[SET-T] #inertiaValue = "45"
[SET-W] #inertiaBar = 45%
[SET-T] #resourceValue = "50%"
...и так далее...
```

**Всего вы должны увидеть ~25 [SET-T] и [SET-W] вызовов за одну итерацию.**

### Статистика в консоли:

Введите в консоли:

```javascript
// Посчитать сколько раз обновлены элементы
window.__setT_calls  // должно быть > 50 (если активно обновляется)
window.__setW_calls  // должно быть > 20
window.__loopDebug   // должно быть > 10
window.__telemetryDebug  // должно быть > 10
```

## Шаг 4: Проверьте что происходит

### Вариант A: Все обновляется ✅

- Консоль заполнена логами [SET-T], [SET-W], [RENDER]
- Телеметрия панель обновляет значения
- Все 28 элементов имеют разные значения

**→ Проблема РЕШЕНА! Система работает!**

### Вариант B: Частичное обновление ⚠️

- Некоторые логи видны, но не все
- Только часть элементов обновляется
- Панель выглядит "замороженной"

**→ Проверьте консоль на WARNINGS:**

```
[SET-T] Element #someId not found in DOM!
```

Если видите такие предупреждения - означает, что элемент в HTML не найден.

### Вариант C: Вообще нет логов ❌

- Консоль молчит после нажатия "СТАРТ"
- Нет [LOOP], [RENDER], [SET-T], [SET-W]

**→ Проблемы:**

1. **loop() не вызывается:**
   ```javascript
   // Проверьте в консоли:
   typeof window.__legacyEngine
   // должно быть "object"
   
   typeof window.__legacyEngine.start
   // должно быть "function"
   ```

2. **setT/setW не определены:**
   ```javascript
   typeof window.__setT
   // должно быть "function"
   
   typeof window.__setW
   // должно быть "function"
   ```

3. **DOM элементы не загружены:**
   ```javascript
   document.getElementById("freqValue")
   // должно вернуть HTMLElement, не null
   ```

## Шаг 5: Команды для отладки

### Проверить состояние системы:

```javascript
// 1. Проверить алгоритм
typeof window.__legacyEngine  // "object"
typeof scan  // "object"
typeof loop  // "function"

// 2. Проверить функции обновления
typeof window.__setT  // "function"
typeof window.__setW  // "function"
typeof window.__$  // "function"

// 3. Проверить элементы
document.getElementById("freqValue").textContent  // должна быть цифра
document.getElementById("freqBar").style.width  // должна быть %, например "45%"

// 4. Посчитать обновления
console.log("setT вызовов:", window.__setT_calls || 0)
console.log("setW вызовов:", window.__setW_calls || 0)
console.log("LOOP итераций:", window.__loopDebug || 0)
console.log("RENDER вызовов:", window.__telemetryDebug || 0)
```

### Принудительно запустить loop():

```javascript
// Если loop() не запустился автоматически
loop()

// Или через engine:
window.__legacyEngine.start()
```

### Отследить конкретный элемент:

```javascript
// Смотреть, когда обновляется #freqValue
setInterval(() => {
  const val = document.getElementById("freqValue").textContent
  console.log("freqValue текущее значение:", val)
}, 500)
```

## Шаг 6: Сбор информации для отчета

Если что-то не работает, соберите эту информацию:

```javascript
// Скопируйте эту команду в консоль и нажмите Enter:
copy(JSON.stringify({
  legacyEngine: typeof window.__legacyEngine,
  setT: typeof window.__setT,
  scan: typeof scan,
  setT_calls: window.__setT_calls || 0,
  setW_calls: window.__setW_calls || 0,
  loopDebug: window.__loopDebug || 0,
  renderDebug: window.__telemetryDebug || 0,
  freqValue_text: document.getElementById("freqValue")?.textContent,
  freqBar_width: document.getElementById("freqBar")?.style.width,
  timestamp: new Date().toISOString()
}, null, 2))

// Результат скопирован в буфер обмена - отправьте его в отчет!
```

## Ожидаемый результат при нормальной работе

### В консоли каждые ~160ms вы должны видеть:

```
[LOOP 1] Starting...
[RENDER 1] out= {f: 2.34, conf: 0.78, ...}
[SET-T] #freqValue = "2.340"
[SET-W] #freqBar = 23%
[SET-T] #confValue = "78"
[SET-W] #confBar = 78%
[SET-T] #inertiaValue = "45"
[SET-W] #inertiaBar = 45%
...
[SET-T] #info = "Анализируется… (neuro-homeostasis J→0)"

[LOOP 2] Starting...
[RENDER 2] out= {f: 2.41, conf: 0.79, ...}
...
```

**Цифры должны меняться каждый раз!**

### На странице вы должны видеть:

- ✅ `#freqValue` меняет числа каждые 160ms (2.340 → 2.341 → 2.345 → ...)
- ✅ `#freqBar` progress bar заполняется
- ✅ `#confValue` процент уверенности меняется
- ✅ `#inertiaValue` инерция меняется
- ✅ Все 28 элементов на панели обновляются
- ✅ Status text может показывать "Анализируется…"

## Если все работает правильно 🎉

Поздравляем! Телеметрия работает полностью:
1. Реальный алгоритм работает
2. Функции обновления вызываются
3. DOM элементы обновляются
4. Пользователь видит данные в реальном времени

## Если что-то не работает 🔧

1. **Проверьте консоль на ошибки** (красный текст)
2. **Посмотрите WARNINGS** ([SET-T] Element not found)
3. **Используйте команды отладки** из раздела выше
4. **Откройте DevTools Network** - смотрите, нет ли 404 ошибок

---

**Обновлено:** 1 ноября 2025
**Версия:** 3.0 - с полным отладочным логированием
