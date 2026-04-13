export default function Offers({ onBook }) {
  return (
    <section className="offers">
      <h2>Simple Pricing</h2>

      <div className="card">
        <h3>₹999 / month</h3>
        <p>All services included + weekly visit</p>

        <button onClick={onBook}>Subscribe Now</button>
      </div>
    </section>
  );
}