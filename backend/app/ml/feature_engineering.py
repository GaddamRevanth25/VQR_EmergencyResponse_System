"""
Feature Engineering Module
"""

import numpy as np


class FeatureExtractor:

    def calculate_mean(self, signal):
        return np.mean(signal)

    def calculate_std(self, signal):
        return np.std(signal)

    def calculate_max(self, signal):
        return np.max(signal)

    def calculate_min(self, signal):
        return np.min(signal)

    def calculate_rms(self, signal):
        return np.sqrt(np.mean(np.square(signal)))

    def extract_features(self, signal):

        features = {

            "mean": self.calculate_mean(signal),

            "std": self.calculate_std(signal),

            "max": self.calculate_max(signal),

            "min": self.calculate_min(signal),

            "rms": self.calculate_rms(signal)

        }

        return features