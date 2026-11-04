/* Pix copia e cola (BR Code estático do Banco Central) — usado em presentes.html e admin-presentes.html */
(function (raiz) {
  // Só caracteres que todo banco aceita no código: sem acento e sem símbolos
  const ascii = (s, max) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .\-]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

  const campo = (id, valor) => id + String(valor.length).padStart(2, "0") + valor;

  // CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido no campo 63
  function crc16(str) {
    let crc = 0xffff;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  // { chave, nome, cidade, valor, txid } → código copia e cola
  function gerar({ chave, nome, cidade, valor, txid }) {
    const conta = campo("00", "br.gov.bcb.pix") + campo("01", String(chave).trim());
    const ref = String(txid || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 25) || "***";
    let p = campo("00", "01")
      + campo("26", conta)
      + campo("52", "0000")
      + campo("53", "986");
    if (valor) p += campo("54", Number(valor).toFixed(2));
    p += campo("58", "BR")
      + campo("59", ascii(nome, 25) || "RECEBEDOR")
      + campo("60", ascii(cidade, 15) || "BRASIL")
      + campo("62", campo("05", ref))
      + "6304";
    return p + crc16(p);
  }

  const api = { gerar, crc16, ascii };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.PixKK = api;
})(typeof window !== "undefined" ? window : this);
