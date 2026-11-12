export async function apiRequest(url, options = {}) {
  const fetchOptions = {
    credentials: 'same-origin',
    ...options,
  };

  if (options.body && typeof options.body !== 'string') {
    fetchOptions.headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { ok: res.ok, status: res.status, data };
}

export async function apiJson(url, options = {}) {
  const { ok, status, data } = await apiRequest(url, options);
  if (!ok) {
    throw new Error((data && data.error) || `Request failed (${status})`);
  }
  return data;
}

