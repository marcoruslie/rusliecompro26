export default function AdminLoading() {
  return (
    <div className="admin-loading">
      <div className="admin-loading-mark">
        <div className="admin-spinner" />
        <span className="admin-loading-r">R</span>
      </div>
      <p className="admin-loading-text">Memuat…</p>
    </div>
  );
}
