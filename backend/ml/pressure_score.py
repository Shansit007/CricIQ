
# pressure_score.py
# Custom Pressure Score metric invented for CricIQ

def calculate_pressure_score(runs_needed, balls_remaining, 
                               wickets_fallen, win_probability):
    if balls_remaining <= 0:
        return 100.0
    required_rate = runs_needed / balls_remaining
    wickets_in_hand = 10 - wickets_fallen
    wicket_pressure = 1 - (wickets_in_hand / 10)
    run_rate_pressure = min(required_rate / 3, 1.0)
    win_pressure = 1 - win_probability
    pressure = (
        (win_pressure * 0.50) +
        (run_rate_pressure * 0.30) +
        (wicket_pressure * 0.20)
    ) * 100
    return round(pressure, 2)
