const SALES = [
  { name: 'Danial', phone: '601110892029', active: true },
  { name: 'Miza', phone: '60109262029', active: true },
  { name: 'Anisha', phone: '60189420299', active: true },
];

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.ROTATOR_DB) {
    return json({ error: 'Rotator belum disambung ke database.' }, 503);
  }

  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: 'Permintaan tidak dibenarkan.' }, 403);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Data tidak lengkap.' }, 400);
  }

  const products = ['Baju sublimation RM28/pc + free patch'];
  const product = typeof data.product === 'string' ? data.product : '';
  const quantity = Number(data.quantity);
  const group = typeof data.group === 'string'
    ? data.group.trim().slice(0, 100)
    : '';
  const notes = typeof data.notes === 'string'
    ? data.notes.trim().slice(0, 160)
    : '';
  const date = typeof data.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(data.date)
    ? data.date
    : '';

  if (!Number.isInteger(quantity) || quantity < 10 || quantity > 100000) {
    return json({
      error: 'Minimum tempahan ialah 10 helai. Masukkan 10 helai atau lebih.'
    }, 400);
  }

  if (!products.includes(product) || !group) {
    return json({
      error: 'Semak semula produk dan kegunaan tempahan.'
    }, 400);
  }

  const active = SALES.filter(rep => rep.active);
  if (!active.length) {
    return json({ error: 'Team sales belum tersedia. Cuba lagi kemudian.' }, 503);
  }

  try {
    const row = await env.ROTATOR_DB
      .prepare('UPDATE rotation SET next_index = (next_index + 1) % ? WHERE id = 1 RETURNING next_index')
      .bind(active.length)
      .first();

    if (!row) throw new Error('Missing rotation row');

    const index = (Number(row.next_index) + active.length - 1) % active.length;
    const rep = active[index];

    const message = [
      'Hi, saya nak tanya tempahan Pakar Sublimation Utara.',
      `Produk: ${product}`,
      `Anggaran: ${quantity} helai`,
      `Untuk: ${group}`,
      date && `Tarikh sasaran: ${date}`,
      notes && `Nota: ${notes}`,
    ].filter(Boolean).join('\n');

    return json({
      url: `https://wa.me/${rep.phone}?text=${encodeURIComponent(message)}`
    });
  } catch {
    return json({ error: 'Rotator belum tersedia. Cuba lagi sebentar.' }, 503);
  }
}
