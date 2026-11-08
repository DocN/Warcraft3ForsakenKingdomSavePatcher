namespace ForsakenSaveRepair;

public partial class Form1 : Form
{
    public Form1()
    {
        InitializeComponent();
        Text = "Forsaken Kingdom Save Patcher";
        MinimumSize = new Size(640, 360);
        var choose = new Button { Text = "Select campaign folder…", AutoSize = true };
        var patch = new Button { Text = "Patch all saves", AutoSize = true, Enabled = false };
        var folder = new TextBox { ReadOnly = true, Dock = DockStyle.Top, PlaceholderText = "Select your ForsakenKingdom folder" };
        var log = new TextBox { Multiline = true, ReadOnly = true, Dock = DockStyle.Fill, ScrollBars = ScrollBars.Vertical };
        var buttons = new FlowLayoutPanel { Dock = DockStyle.Top, AutoSize = true };
        buttons.Controls.AddRange([choose, patch]);
        Controls.Add(log);
        Controls.Add(buttons);
        Controls.Add(folder);
        Padding = new Padding(14);
        log.Text = "Close Warcraft III before patching. Converted copies target build 3.0.1.24371.";
        choose.Click += (_, _) =>
        {
            using var dialog = new FolderBrowserDialog { Description = "Select the ForsakenKingdom campaign folder", ShowNewFolderButton = false };
            if (dialog.ShowDialog(this) != DialogResult.OK) return;
            folder.Text = dialog.SelectedPath;
            patch.Enabled = true;
        };
        FormClosing += (_, e) =>
        {
            if (choose.Enabled) return;
            e.Cancel = true;
            MessageBox.Show(this, "Please let the batch finish before closing.");
        };
        patch.Click += async (_, _) =>
        {
            choose.Enabled = patch.Enabled = false;
            log.Clear();
            try
            {
                var engine = Path.Combine(Path.GetDirectoryName(typeof(Form1).Assembly.Location)!, "Engine");
                var bundledNode = Path.Combine(engine, "node.exe");
                var start = new System.Diagnostics.ProcessStartInfo(File.Exists(bundledNode) ? bundledNode : "node.exe")
                {
                    UseShellExecute = false, CreateNoWindow = true,
                    RedirectStandardOutput = true, RedirectStandardError = true,
                    StandardOutputEncoding = System.Text.Encoding.UTF8
                };
                start.ArgumentList.Add(Path.Combine(engine, "batch.mjs"));
                start.ArgumentList.Add(folder.Text);
                using var process = System.Diagnostics.Process.Start(start) ?? throw new IOException("Could not start Node.js.");
                var errors = process.StandardError.ReadToEndAsync();
                while (await process.StandardOutput.ReadLineAsync() is { } line) log.AppendText(line + Environment.NewLine);
                await process.WaitForExitAsync();
                log.AppendText(await errors);
                if (process.ExitCode != 0) log.AppendText("Review the errors above before retrying.");
            }
            catch (Exception ex) { log.AppendText(ex.Message); }
            finally { choose.Enabled = true; patch.Enabled = true; }
        };
    }
}

