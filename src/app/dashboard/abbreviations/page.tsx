
"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { medicalAbbreviations } from "@/lib/abbreviations-data";

export default function AbbreviationsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredAbbreviations = useMemo(() => {
    return medicalAbbreviations.filter(
      (abbr) =>
        abbr.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
        abbr.definition.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

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
          <div className="relative pt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search terms or definitions..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Term</TableHead>
                <TableHead>Definition</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAbbreviations.length > 0 ? (
                filteredAbbreviations.map((abbr, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{abbr.term}</TableCell>
                    <TableCell>{abbr.definition}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
