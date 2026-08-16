import { IsISO8601, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';

export class CreateEventDto {
  @IsUUID()
  artistId: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsISO8601()
  eventDate: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsInt()
  @Min(1)
  minimumQuorum: number;

  @IsInt()
  @Min(0)
  priceCents: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}
