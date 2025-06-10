namespace PmuDataConcentrator.Core.Enums
{
    public enum DataFormat
    {
        Rectangular = 0,
        Polar = 1
    }

    public enum EventType
    {
        FrequencyDeviation,
        RapidFrequencyChange,
        VoltageViolation,
        VoltageCollapse,
        PhaseAngleDeviation,
        Oscillation,
        DataQualityIssue,
        CommunicationLoss,
        SystemRestart,
        ConfigurationChange
    }

    public enum EventSeverity
    {
        Information,
        Warning,
        Critical,
        Emergency
    }

    public enum FrameType
    {
        Data = 0,
        Configuration1 = 1,
        Configuration2 = 2,
        Configuration3 = 3,
        Command = 4
    }
}