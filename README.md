# findAndReplaceDOMText

[findAndReplaceDOMText](https://github.com/padolsey/findAndReplaceDOMText)をTypeScriptで書き換えました。  
JavaScript独特の構文に詳しくないので、できる限り平易なプログラムになるよう書き換えています。  
そのため、オリジナルの細かい機能が省略されている可能性があります。  


**[デモを動かしてみる](https://piment831.github.io/findAndReplaceDOMText/demo.html)**

`findAndReplaceDOMText` 指定されたDOMから、正規表現にマッチする個所を検索し、ノードまたがりを考慮して、マッチした個所を置換します。

例:

```html
<p id="t">
  123 456 Hello
</p>
```

```js
findAndReplaceDOMText(document.getElementById('t'), {
  find: /Hello/,
  wrap: 'em'
});
```

こうなります。

```html
<p id="t">
  123 456 <em>Hello</em>
</p>
```

**ノードをまたいでいても大丈夫**!

```html
<p id="t">
  123 456 Hell<span>o Goodbye</span>
</p>
```

```js
findAndReplaceDOMText(document.getElementById('t'), {
  find: /Hello/,
  wrap: 'em'
});
```

こうなります。

```html
<p id="t">
  123 456 <em>Hell</em><span><em>o</em> Goodbye</span>
</p>
```

ノードまたがりを考慮して、`EM`をそれぞれに付与します。

## インストール

Grab the latest [findAndReplaceDOMText.js](https://github.com/piment831/findAndReplaceDOMText/lib/findAndReplaceDOMText.js) and include it as a `<script>` on your page.

## 使い方

```js
findAndReplaceDOMText(
  element, // (Element) The element or text-node to search within
  options  // (Object) Explained below
);
```

### API

#### Options

 * **find** (`RegExp | String`): 検索対象。文字列はすべてのマッチを検索しますが、RegExpはグローバル（/.../g）フラグを含む場合にのみ、すべての検索を行います。
 * **replace** *optional* (`String | Function`): 置換する文字列、または関数（要素や文字列を返す）。文字列の場合、パラメーターを含むことができます。
  * `$n` 正規表現（`$1`, `$2`, ...）の *n* 番目のキャプチャグループを表します。
  * `$0` or `$&` マッチした全体を表します。
  * <code>$`</code> マッチした左にあるすべてのものを表します。
  * `$'` マッチした右にあるすべてのものを表します。
 * **wrap** *optional* (`String | Node`): マッチした個所をラップするノード名の文字列（例：spanやem）。
 * **wrapClass** *optional* (`String`): ラップするノードに付与するクラス文字列（例：`<span class="myClass">found text</span>` ）。 `wrap` オプションがない場合、無視される。
 * **portionMode** *optional* (`String`, one of `"retain"` or `"first"`): マッチした部分をテキストで置き換える際に、既存のノード境界を再利用するか（つまり、デフォルトの「retain」）、代わりに最初にマッチした個所のノードに全体を配置するかを指定します。ほとんどの場合、デフォルトを使用します。
 * **filterElements** *optional* (`Function`): `findAndReplaceDOMText`が検索する要素に対して呼び出される関数です。この関数が false を返した場合、その要素は完全に無視されます。
 * **forceContext** *optional* (`Function | Boolean`): すべての要素に対して呼び出され、その要素を独自のマッチングコンテキストとして考慮するかどうかを返す関数です。以下の[*Contexts*](#contexts)の項を参照。
 * **preset** *optional* (`String`): 現在、プリセットは`prose`だけです。下記を参照してください。

#### `preset:prose`

`findAndReplaceDOMText`の一般的な使い方は、すべてのDOMノードではなく、通常のテキストを含むノード内のテキストを置き換えることです。これを簡単にするために、プリセットがあり、それを使って指定できます。

 * 非テキスト要素を無視する (E.g. `<script>`, `<svg>`, `<optgroup>`, `<textarea>`, etc.)
 * <p>`や`<div>`などのブロック要素に[bordered contexts](#contexts)を適用し、複数の要素にまたがらないようにする
 * 注意：テキストインライン要素（`<em>`、`<span>`など）はまたがります。
 
このプリセットを有効にする

```js
findAndReplaceDOMText(element, {
  preset: 'prose',
  find: 'something',
  replace: 'something else'
})
```

#### portion

portion、または"match portion"とは、ノードまたがりで分割されたマッチした一部分のことです。すべてのマッチが1つのテキストノード内で起こるわけではないので、`findAndReplaceDOMText`はノードをまたがったマッチを扱えるようにしなければならない（例えば、`"<em>f</em>oo"`の`/foo/`にマッチする場合など）。

portionは、以下のプロパティを持ちます。
 * `node`: portionのDOMノード。
 * `index`: portionのインデックス（`0`が最初）。
 * `text`: portionの文字列
 * `indexInMatch`: マッチしたportionのインデックス
 * `indexInNode`: ノード内のportionのインデックス

#### The `replace` Function

`replace`に関数を渡すと、その関数はすべてのマッチの各portionに対して呼ばれます。DOMノード（TextまたはElementノード）を返してください。
関数には、portionとマッチの両方が渡されます。

E.g.

*Input HTML*

```html
<div id="container">
  Explaining how to write a replace <em>fun</em>ction
</div>
```

*JS*

```js
findAndReplaceDOMText(document.getElementById('container'), {
  find: 'function',
  replace: function(portion, match) {
    return '[[' + portion.index + ']]';
  }
});
```

*Output HTML*

```html
<div id="container">
  Explaining how to write a replace <em>[[0]]</em>[[1]]
</div>
```

#### The `wrap` Option

`wrap`オプションに文字列を渡すと、一致するテキストがその要素でラップされます。 `wrapClass`オプションも指定すると、ラップされる要素には、作成後にそのクラスが付与されます。 これは、cssで様々なスタイルを適用するのに便利です。

E.g.

*Input HTML*

```html
<div id="container">
  Explaining how to wrap text in elements with and without classes assigned.
</div>
```

*JS*

```js
findAndReplaceDOMText(document.getElementById('container'), {
 find: 'without',
 wrap: 'em'
});
findAndReplaceDOMText(document.getElementById('container'), {
 find: 'with ',
 wrap: 'em',
 wrapClass: 'shiny'
});
```

*CSS*

```css
.shiny {
 background-color: yellow;
}
```

*Output HTML*

```html
<div id="container">
  Explaining how to wrap text in elements <em class="shiny">with </em>and <em>without</em> classes assigned.
</div>
```

#### The instance

`findAndReplaceDOMText`を呼び出すと、内部のFinderコンストラクタのインスタンスが返されます -- このオブジェクトのAPIは、今のところ、元に戻すだけに限られています。

```js
var finder = findAndReplaceDOMText(...);

// Later:
finder.revert();
```

**注意:**「元に戻す」は、呼び出し前のDOMから変更がない場合のみ機能します -- 削除、移動、正常化があった場合、戻す機能は保証されません。この場合、独自にターゲットノードのクローンを保持することが最善です。

### Contexts

デフォルトの検索は、すべての要素が対象で、要素のまたがりを考慮します。

Before:

```html
<div id="test">
  <p>ama</p><p>zing</p>
</div>
```

```js
findAndReplaceDOMText(document.getElementById('test'), {
  find: 'amazing',
  wrap: 'em'
});
```

After:

```html
<div id="test">
  <p><em>ama</em></p><p><em>zing</em></p>
</div>
```

これはインライン要素に対しては便利ですが、多くのケースでは望ましくないので、これを防ぐために、特定の要素に「コンテキストを強制する」ことを選択することができます。
この場合、`<p>`要素に適用します。

```js
findAndReplaceDOMText(document.getElementById('test'), {
  find: 'amazing',
  wrap: 'em',
  forceContext: function(el) {
    // Using https://developer.mozilla.org/en-US/docs/Web/API/Element/matches
    return el.matches('p');
  }
});
```

内部的には、`prose`プリセットが使用しています。

```js
exposed.PRESETS = {
  prose: {
    forceContext: exposed.NON_INLINE_PROSE,
    filterElements: function(el) {
      return !hasOwn.call(exposed.NON_PROSE_ELEMENTS, el.nodeName.toLowerCase());
    }
  }
};
```
