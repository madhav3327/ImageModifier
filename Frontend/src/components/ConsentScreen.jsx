import React, { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

export default function ConsentScreen({ onConsent }) {
  const [canUseForProjects, setCanUseForProjects] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-xl mx-auto px-4 py-16 text-center"
    >
      <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
      <h2 className="text-4xl font-bold mb-4">Your Permissions</h2>
      
      {/* First Consent Clause */}
      <p className="text-lg mb-4 opacity-70">
        By clicking the button below, you grant permission to use your images
        for modification and storage within this application.
      </p>

      {/* New Consent Clause */}
      <p className="text-sm italic mb-8 opacity-70">
        The images generated are created using a technology provided by Nano Banana,
        and you agree that you are okay with this.
      </p>

      {/* Second Consent Checkbox */}
      <div className="flex items-center justify-center gap-3 mb-8 text-lg">
        <input
          id="project-consent"
          type="checkbox"
          checked={canUseForProjects}
          onChange={(e) => setCanUseForProjects(e.target.checked)}
          className="w-5 h-5 form-checkbox accent-emerald-600 rounded"
        />
        <label htmlFor="project-consent" className="text-left leading-tight">
          Allow us to use your images for our further projects.
          <br />
          <span className="text-sm italic opacity-70">
            (If you do not check this, we will not store them.)
          </span>
        </label>
      </div>

      <button
        onClick={() => onConsent(canUseForProjects)}
        className="w-full px-8 py-4 rounded-xl text-lg font-bold bg-emerald-600 hover:bg-emerald-500 transition"
      >
        I Give Consent
      </button>
    </motion.div>
  );
}