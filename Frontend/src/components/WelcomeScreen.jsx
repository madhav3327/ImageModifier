import React, { useState } from "react";
import { motion } from "framer-motion";
import StaticNeuralBackground from "./StaticNeuralBackground";

export default function WelcomeScreen({ onNext, onUserDataChange }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");

  const handleNext = () => {
    if (name.trim() && age.trim() && !isNaN(age) && age > 0) {
      onUserDataChange({ name, age });
      onNext();
    } else {
      alert("Please enter a valid name and age.");
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center">
      <StaticNeuralBackground />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 w-full max-w-xl mx-auto p-8 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-lg text-center"
      >
        <h2 className="text-4xl font-bold mb-4">Welcome to Image Modifier!</h2>
        <p className="text-xl opacity-70 mb-8">
          Enter your details to begin your creative journey.
        </p>

        <div className="grid gap-4 mb-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name"
            className={`w-full px-4 py-3 bg-transparent border-b-2 outline-none text-white/90
              ${name ? 'border-indigo-500' : 'border-white/20'}`}
          />
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Your Age"
            className={`w-full px-4 py-3 bg-transparent border-b-2 outline-none text-white/90
              ${age ? 'border-indigo-500' : 'border-white/20'}`}
          />
        </div>

        <button
          onClick={handleNext}
          className="w-full px-8 py-4 rounded-xl text-lg font-bold bg-indigo-600 hover:bg-indigo-500 transition"
        >
          Let's Begin the Fun!
        </button>
      </motion.div>
    </div>
  );
}