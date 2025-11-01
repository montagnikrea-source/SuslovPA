# 🧪 ИНСТРУКЦИЯ ПРОВЕРКИ ИНТЕРФЕЙСА

## Результаты Тестирования Кода

✅ **Все элементы присутствуют:**
- Learning Rate (lr): Slider + Value + Progress Bar + AUTO
- L2-регуляризация (l2): Slider + Value + Progress Bar + AUTO  
- Mix (смешивание): Slider + Value + Progress Bar + AUTO

✅ **Все элементы обновляются в render():**
- Слайдеры обновляют значения из алгоритма
- Текстовые значения обновляются через setT()
- Progress bars обновляются через setW()

✅ **AUTO логика присутствует:**
- Все 3 параметра имеют логику AUTO переключения

---

## 🔧 Как Протестировать в Браузере

### Шаг 1: Откройте Сайт
- **Vercel:** https://suslovpa.vercel.app
- **GitHub:** https://montagnikrea-source.github.io/SuslovPA

### Шаг 2: Откройте Консоль
1. Нажмите **F12** (или Cmd+Option+J на Mac)
2. Перейдите на вкладку **Console**
3. Очистите консоль (Ctrl+L или Cmd+K)

### Шаг 3: Нажмите "СТАРТ"

Должны появиться логи:
```
[LOOP 1] Starting...
[RENDER 1] out= {...}
[SET-T] #freqValue = "2.345"
[SET-W] #freqBar = 23%
...
[SET-T] #lrVal = "0.030"
[SET-W] #lrBar = 14%
[SET-T] #l2Val = "0.0001"
[SET-W] #l2Bar = 1%
[SET-T] #mixVal = "0.75"
[SET-W] #mixBar = 75%
...
```

### Шаг 4: Проверьте Элементы

**Параметры обучения должны обновляться:**

```
Learning Rate (lr):
  - Значение: 0.030 → 0.031 → 0.032 (меняется)
  - Progress bar: 0% → 5% → 10% (заполняется)
  - AUTO: галка включена/выключена

L2-регуляризация (l2):
  - Значение: 0.0001 → 0.0002 → ... (меняется)
  - Progress bar: 0% → 2% → ... (заполняется)
  - AUTO: галка включена/выключена

Смешивание NN/PI (mix):
  - Значение: 0.75 → 0.76 → 0.77 (меняется)
  - Progress bar: 75% → 76% → 77% (заполняется)
  - AUTO: галка включена/выключена
```

---

## 📊 Команды Отладки в Консоли Браузера

Выполните эти команды в консоли (F12):

### 1. Проверить базовые метрики:
```javascript
// Сколько раз вызвана render()
window.__telemetryDebug

// Сколько раз обновлены текстовые элементы
window.__setT_calls

// Сколько раз обновлены progress bars
window.__setW_calls
```

### 2. Проверить значения слайдеров:
```javascript
document.getElementById('lrSlider').value
document.getElementById('l2Slider').value
document.getElementById('mixSlider').value
```

### 3. Проверить текстовые значения:
```javascript
document.getElementById('lrVal').textContent
document.getElementById('l2Val').textContent
document.getElementById('mixVal').textContent
```

### 4. Проверить progress bars:
```javascript
document.getElementById('lrBar').style.width
document.getElementById('l2Bar').style.width
document.getElementById('mixBar').style.width
```

### 5. Проверить AUTO checkboxes:
```javascript
document.getElementById('lrAuto').checked
document.getElementById('l2Auto').checked
document.getElementById('mixAuto').checked
```

### 6. Проверить ВСЕ 28 элементов телеметрии:
```javascript
// Это выведет текущие значения всех элементов
const elements = ['freqValue', 'confValue', 'inertiaValue', 'lrVal', 'l2Val', 'mixVal', 
                  'resourceValue', 'lrAdaptValue', 'mixAdaptValue', 'KpAdaptValue', 
                  'HValue', 'qualityValue', 'freezeStatusValue', 'precisionValue', 'statusText'];

elements.forEach(id => {
  const el = document.getElementById(id);
  console.log(`${id}: ${el?.textContent || 'NOT FOUND'}`);
});
```

---

## ✅ Ожидаемые Результаты

### Если всё работает правильно:

1. **Консоль:** Полна логов [SET-T], [SET-W], [RENDER]
2. **Параметры lr/l2/mix:** Числа меняются каждые ~160ms
3. **Progress bars:** Заполняются сообразно значениям
4. **AUTO checkboxes:** Переключаются между режимами
5. **Другие метрики:** Все 28 элементов обновляются

### Если что-то не работает:

| Проблема | Причина | Решение |
|----------|---------|---------|
| Нет логов в консоли | loop() не запустился | Проверьте что нажали кнопку "СТАРТ" |
| Значения не меняются | render() не вызывается | Проверьте console на ошибки красным |
| Progress bars не заполняются | setW() не вызывается | Проверьте window.__setW_calls > 0 |
| Элемент = null | Элемента нет в HTML | Проверьте HTML на наличие id |
| Value меняется, bar нет | setW() не вызывается для bar | Проверьте логику в render() |

---

## 🔍 Известные Особенности

### Слайдеры НЕ имеют отдельных Event Listeners
- ✅ Это НОРМАЛЬНО - значения обновляются из алгоритма через render()
- Слайдеры обновляются ТОЛЬКО через render() на основе данных из window.__legacyEngine
- Когда вы движете слайдер вручную, он НЕ отправляет данные обратно в алгоритм
- Вместо этого алгоритм читает значения слайдера через render()

### AUTO Checkboxes - это переключатели режимов
- Когда AUTO ✅ = ON: слайдеры обновляются автоматически из алгоритма
- Когда AUTO ☐ = OFF: слайдеры обновляются из значений которые вы установили

### Progress Bars привязаны к Значениям, НЕ к Слайдерам
- Связь: **Алгоритм → Значение (setT) → Расчет % → Progress Bar (setW)**
- Слайдер просто отображает текущее значение
- Progress bar показывает диапазон от min до max

---

## 📋 Чек-лист Проверки

- [ ] Открыл сайт в браузере
- [ ] Открыл консоль (F12)
- [ ] Нажал кнопку "СТАРТ"
- [ ] Вижу логи [LOOP], [RENDER], [SET-T], [SET-W]
- [ ] Learning Rate меняет значение
- [ ] Learning Rate progress bar заполняется
- [ ] L2 меняет значение
- [ ] L2 progress bar заполняется
- [ ] Mix меняет значение
- [ ] Mix progress bar заполняется
- [ ] AUTO checkboxes переключаются
- [ ] Все 28 элементов панели обновляются
- [ ] Нет красных ошибок в консоли

**Если все пункты выполнены → 🎉 СИСТЕМА РАБОТАЕТ ПОЛНОСТЬЮ!**

---

**Создано:** 1 ноября 2025  
**Версия:** 1.0
