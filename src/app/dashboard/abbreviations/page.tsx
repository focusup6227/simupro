import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { medicalAbbreviations } from "@/lib/abbreviations-data";
import { AbbreviationsSearch } from "@/components/abbreviations-search";

export default function AbbreviationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Common Medical Abbreviations
        </h1>
        <p className="text-muted-foreground">
          A quick reference for terms you might encounter in the field.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Abbreviation List</CardTitle>
          <CardDescription>
            Search for an abbreviation or its definition.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AbbreviationsSearch data={medicalAbbreviations} />
        </CardContent>
      </Card>
    </div>
  );
}
