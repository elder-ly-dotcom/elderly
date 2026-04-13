export default function ServiceCard({ service, onRequest }) {
  return (
    <div className="card">
      <h3>{service.name}</h3>
      <p>{service.category}</p>
      <button onClick={() => onRequest(service.id)}>Request Service</button>
    </div>
  );
}