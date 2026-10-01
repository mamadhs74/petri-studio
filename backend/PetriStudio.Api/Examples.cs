namespace PetriStudio.Api;

public static class Examples
{
    /// <summary>
    /// Two queues in tandem with a finite customer population.
    /// Overflow of the second queue is a classic rare-event target.
    /// </summary>
    public static PetriNet TandemQueue() => new(
        Places:
        [
            new Place("p_source", "Customers outside", 10),
            new Place("p_q1", "Queue 1", 0),
            new Place("p_q2", "Queue 2", 0),
        ],
        Transitions:
        [
            new Transition("t_arrive", "Arrival", 1.0),
            new Transition("t_serve1", "Service 1", 2.0),
            new Transition("t_serve2", "Service 2", 3.0),
        ],
        Arcs:
        [
            new Arc("a1", "p_source", "t_arrive", 1),
            new Arc("a2", "t_arrive", "p_q1", 1),
            new Arc("a3", "p_q1", "t_serve1", 1),
            new Arc("a4", "t_serve1", "p_q2", 1),
            new Arc("a5", "p_q2", "t_serve2", 1),
            new Arc("a6", "t_serve2", "p_source", 1),
        ]);
}
