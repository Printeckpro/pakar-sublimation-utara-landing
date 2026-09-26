const SALES = [
  { name: "Danial", phone: "601110892029", active: true },
  { name: "Miza", phone: "60109262029", active: true },
  { name: "Anisha", phone: "60189420299", active: true },
];

const PRODUCT = "Baju sublimation RM28/pc + free patch";

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.ROTATOR_DB) {
    return reply({ error: "Database rotator belum disambung." }, 503);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return reply({ error: "Data tempahan tidak lengkap." }, 400);
  }

  const quantity = Number(data.quantity);
  const group = typeof data.group === "string"
    ? data.group.trim().slice(0, 100)
    : "";
  const notes = typeof data.notes === "string"
    ? data.notes.trim().slice(0, 160)
    : "";
  const date = typeof data.date === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(data.date)
      ? data.date
      : "";

  if (
    data.product !== PRODUCT ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 100000 ||
    !group
  ) {
    return reply({ error: "Semak semula detail tempahan." }, 400);
  }

  const activeSales = SALES.filter((person) => person.active);

  try {
    const row = await env.ROTATOR_DB
      .prepare(
        "UPDATE rotation SET next_index = (next_index + 1) % ? " +
        "WHERE id = 1 RETURNING next_index"
      )
      .bind(activeSales.length)
      .first();

    if (!row) throw new Error("Giliran rotator tidak dijumpai");

    const index =
      (Number(row.next_index) + activeSales.length - 1)
      % activeSales.length;
    const sales = activeSales[index];

    const message = [
      "Hi, saya nak tanya tempahan Pakar Sublimation Utara.",
      `Produk: ${PRODUCT}`,
      `Anggaran: ${quantity} helai`,
      `Untuk: ${group}`,
      date && `Tarikh sasaran: ${date}`,
      notes && `Nota: ${notes}`,
    ].filter(Boolean).join("\n");

    return reply({
      url: `https://wa.me/${sales.phone}?text=${encodeURIComponent(message)}`,
    });
  } catch {
    return reply({
      error: "Rotator belum tersedia. Cuba lagi sebentar.",
    }, 503);
  }
}
