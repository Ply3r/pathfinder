<script>
  export default {
    props: {
      modelValue: { type: Number, required: true },
      min: { type: Number, default: 0 },
      max: { type: Number, default: 100 },
      step: { type: Number, default: 1 },
      label: { type: String, default: "" },
      valueText: { type: String, default: "" },
      hint: { type: String, default: "" },
      disabled: { type: Boolean, default: false }
    },
    emits: ["update:modelValue", "change"],
    computed: {
      // posicao do valor entre 0 e 1, usada para pintar a parte preenchida da trilha
      progress() {
        return (this.modelValue - this.min) / (this.max - this.min);
      }
    },
    methods: {
      onInput(event) {
        this.$emit("update:modelValue", +event.target.value);
      },
      onChange(event) {
        // disparado ao soltar o mouse/dedo e a cada passo do teclado
        this.$emit("change", +event.target.value);
      }
    }
  }
</script>

<template>
  <div class="range" :class="{ range_disabled: disabled }">
    <div class="range_header">
      <span class="range_label">{{ label }}</span>
      <span class="range_value">{{ valueText || modelValue }}</span>
    </div>
    <input
      class="range_input"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      :disabled="disabled"
      :aria-label="label"
      :style="{ '--p': progress }"
      @input="onInput"
      @change="onChange"
    />
    <div class="range_scale">
      <span>{{ min }}</span>
      <span class="range_hint">{{ hint }}</span>
      <span>{{ max }}</span>
    </div>
  </div>
</template>

<style scoped>
.range {
  --fill: rgb(0, 150, 110);
  --track: rgba(0, 0, 0, 0.18);
  --thumb: 22px;
  --track-height: 8px;

  margin-top: 18px;
}

.range_header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.8);
}

.range_value {
  min-width: 64px;
  padding: 2px 10px;
  border-radius: 12px;
  background: white;
  text-align: center;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.range_input {
  display: block;
  width: 100%;
  height: var(--thumb);
  margin: 0;
  background: transparent;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  touch-action: pan-y;
}

.range_input:focus {
  outline: none;
}

/* ---- trilha (WebKit/Blink): parte preenchida via gradiente ---- */
.range_input::-webkit-slider-runnable-track {
  height: var(--track-height);
  border-radius: var(--track-height);
  background: linear-gradient(
    to right,
    var(--fill) calc(var(--thumb) / 2 + (100% - var(--thumb)) * var(--p)),
    var(--track) calc(var(--thumb) / 2 + (100% - var(--thumb)) * var(--p))
  );
}

/* ---- trilha (Firefox) ---- */
.range_input::-moz-range-track {
  height: var(--track-height);
  border-radius: var(--track-height);
  background: var(--track);
}

.range_input::-moz-range-progress {
  height: var(--track-height);
  border-radius: var(--track-height);
  background: var(--fill);
}

/* ---- polegar ---- */
.range_input::-webkit-slider-thumb {
  width: var(--thumb);
  height: var(--thumb);
  margin-top: calc((var(--track-height) - var(--thumb)) / 2);
  border: 3px solid var(--fill);
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  appearance: none;
  -webkit-appearance: none;
}

.range_input::-moz-range-thumb {
  width: calc(var(--thumb) - 6px);
  height: calc(var(--thumb) - 6px);
  border: 3px solid var(--fill);
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.range_input:hover::-webkit-slider-thumb,
.range_input:active::-webkit-slider-thumb {
  transform: scale(1.15);
}

.range_input:hover::-moz-range-thumb,
.range_input:active::-moz-range-thumb {
  transform: scale(1.15);
}

.range_input:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 5px rgba(0, 150, 110, 0.3);
}

.range_input:focus-visible::-moz-range-thumb {
  box-shadow: 0 0 0 5px rgba(0, 150, 110, 0.3);
}

.range_scale {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.55);
  font-variant-numeric: tabular-nums;
}

.range_hint {
  font-style: italic;
}

/* ---- desabilitado ---- */
.range_disabled {
  opacity: 0.5;
}

.range_disabled .range_input {
  cursor: not-allowed;
}
</style>
