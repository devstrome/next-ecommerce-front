import React from 'react';

const StatsSection = () => {
  const stats = [
    {
      number: "10K+",
      label: "Happy Customers",
      icon: "😊",
      color: "bg-[#1B1B1B]"
    },
    {
      number: "50K+",
      label: "Products Sold",
      icon: "📦",
      color: "bg-[#B1123B]"
    },
    {
      number: "99%",
      label: "Satisfaction Rate",
      icon: "⭐",
      color: "bg-[#4A4A4A]"
    },
    {
      number: "24/7",
      label: "Customer Support",
      icon: "🛡️",
      color: "bg-[#B1123B]"
    }
  ];

  return (
    <section className="py-16 bg-[#FAF8F6]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1B1B1B] mb-4" style={{ fontFamily: "'Inter', serif" }}>
            Trusted by Thousands
          </h2>
          <p className="text-lg text-[#4A4A4A] max-w-2xl mx-auto">
            Join our growing community of satisfied customers
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center group"
            >
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${stat.color} text-white text-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                {stat.icon}
              </div>
              <div className="text-3xl md:text-4xl font-bold text-[#1B1B1B] mb-2">
                {stat.number}
              </div>
              <div className="text-[#4A4A4A] font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
