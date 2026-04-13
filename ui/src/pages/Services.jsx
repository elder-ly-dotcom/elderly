import { useState } from "react";
import { servicesList } from "../utils/utils";
import { requestService } from "../api/api";

export default function Services() {
  const [showModal, setShowModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [formData, setFormData] = useState({});

  const userId = 1; // For demo/testing

  const handleBookClick = (service) => {
    setSelectedService(service);
    // Initialize form data keys to empty
    const initialData = {};
    service.formFields.forEach(f => (initialData[f] = ""));
    setFormData(initialData);
    setShowModal(true);
  };

  const handleChange = (e, field) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSubmit = async () => {
    // Construct notes from formData
    const notes = Object.entries(formData)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");

    await requestService(userId, selectedService.id, notes);
    alert(`${selectedService.name} booked successfully!`);
    setShowModal(false);
  };

  return (
    <div className="container">
      <h2>Book a Service</h2>
      <div className="services-grid">
        {servicesList.map((s) => (
          <div key={s.id} className="card">
            <img src={`/images/${s.icon}`} width="50" alt={s.name} />
            <h3>{s.name}</h3>
            <p>{s.category}</p>
            <p>{s.description}</p>
            <button onClick={() => handleBookClick(s)}>Book Now</button>
          </div>
        ))}
      </div>

      {/* Modal Form */}
      {showModal && selectedService && (
        <div className="modal">
          <div className="modal-content">
            <h3>Book {selectedService.name}</h3>
            {selectedService.formFields.map((f) => (
              <div key={f} className="form-group">
                <label>{f}</label>
                <input
                  type="text"
                  value={formData[f]}
                  onChange={(e) => handleChange(e, f)}
                />
              </div>
            ))}
            <button onClick={handleSubmit}>Submit</button>
            <button onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}