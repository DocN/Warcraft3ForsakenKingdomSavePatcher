# Forsaken Kingdom Save Patcher

A Windows Forms batch patcher for Warcraft III Forsaken Kingdom. The .NET 9 interface runs the bundled JavaScript converter locally using Node.js 22 or later. Install the .NET 9 Desktop Runtime and Node.js x64 to run the Windows app. Building requires the .NET 9 SDK.

## Run

Open ForsakenSaveRepair.sln in Visual Studio or run:

    dotnet run --project ForsakenSaveRepair

Close Warcraft III. Click **Select campaign folder**, select the ForsakenKingdom directory containing your main .w3z checkpoints, then click **Patch all saves**. The app checks each root checkpoint and its associated zone saves. Read the results for missing companions or unsupported maps.

Converted files appear alongside the originals with the suffix _upgraded_3.0.1.24371. Load the suffixed checkpoint, test zone travel, then save in-game. Conversion targets that specific Warcraft III build. Incomplete bundles can load with missing zone history. The app reports missing companions and never substitutes snapshots from another checkpoint.

The installer uses temporary staging inside the selected folder and hard links to publish complete files, with the main checkpoint published last. Use a local NTFS volume. Re-running verifies existing converted files against the expected output and resumes matching partial bundles. Conflicting copies are reported and preserved.

## Conversion engine

The bundled offline engine comes from [XPlay1990/forsaken-save-repair](https://github.com/XPlay1990/forsaken-save-repair), revision 30ea5917ddc420198f7992fa09d281badf467bb5. The Windows app and batch runner use its upgrade profile and checkpoint discovery. The converter, pako, and fflate licenses are included in the Engine directory.
