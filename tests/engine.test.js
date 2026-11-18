import { describe, it, expect } from 'vitest';
import { parseIt, val, calc, parseDelim } from '../src/engine.js';

const opts15 = [1, 2, 3, 4, 5].map(v => ({ l: String(v), v }));
const mk = (over = {}) => ({ opts: opts15, conv: 'none',
  items: [{ r: false }, { r: true }, { r: false }, { r: false }],
  scales: [{ name: 'S', it: '1-4', f: 'sum', m: '', sd: '' }], ...over });

describe('parseIt', () => { it('диапазоны и списки', () => expect(parseIt('1-3, 5, 99', 10)).toEqual([1, 2, 3, 5])); });

describe('val (зеркальные баллы)', () => {
  it('1↔5, 2↔4, 3 остаётся', () => { const m = mk(); expect([1, 2, 3, 4, 5].map(x => val(m, String(x), true))).toEqual([5, 4, 3, 2, 1]); });
  it('шкала −3…+3', () => { const m = mk({ opts: [-3, -2, -1, 0, 1, 2, 3].map(v => ({ l: String(v), v })) }); expect(val(m, '-3', true)).toBe(3); expect(val(m, '2', true)).toBe(-2); });
  it('Да/Нет по подписи', () => { const m = mk({ opts: [{ l: 'Да', v: 1 }, { l: 'Нет', v: 0 }] }); expect(val(m, 'да', false)).toBe(1); expect(val(m, 'Да', true)).toBe(0); });
  it('пропуск и мусор → null', () => { const m = mk(); expect(val(m, '', false)).toBe(null); expect(val(m, 'abc', false)).toBe(null); });
  it('запятая как разделитель', () => expect(val(mk(), '3,5', false)).toBe(3.5));
});

describe('calc', () => {
  const r = { a: ['1', '2', '3', '4'] }; // пункт 2 зеркальный: 2 → 4
  it('сумма', () => expect(calc(mk(), r)[0].x).toBe(12));
  it('среднее', () => expect(calc(mk({ scales: [{ it: '1-4', f: 'avg' }] }), r)[0].x).toBe(3));
  it('своя формула', () => expect(calc(mk({ scales: [{ it: '1-4', f: 'sum*2+5' }] }), r)[0].x).toBe(29));
  it('пропуски пропускаются', () => { const o = calc(mk(), { a: ['1', '', '3', '4'] })[0]; expect(o.x).toBe(8); expect(o.n).toBe(3); });
  it('ссылка на предыдущую шкалу', () => expect(calc(mk({ scales: [{ it: '1-2', f: 'sum' }, { it: '3-4', f: 's1+sum' }] }), r)[1].x).toBe(12));
  it('небезопасная формула → ошибка, а не выполнение', () => expect(calc(mk({ scales: [{ it: '1-4', f: 'alert(1)' }] }), r)[0].x).toBeNaN());
  it('T-баллы и z', () => {
    const sc = { it: '1-4', f: 'sum', m: '10', sd: '2' };
    expect(calc(mk({ conv: 'T', scales: [sc] }), r)[0].c).toBeCloseTo(60);
    expect(calc(mk({ conv: 'z', scales: [sc] }), r)[0].c).toBeCloseTo(1);
  });
});

describe('parseDelim', () => {
  it('; и кавычки', () => expect(parseDelim('a;b\r\n"x; y";"3,5"\r\n')).toEqual([['a', 'b'], ['x; y', '3,5']]));
  it('табуляция из Excel и перенос в ячейке', () => expect(parseDelim('a\tb\n"x\ny"\t2\n')).toEqual([['a', 'b'], ['x\ny', '2']]));
});
